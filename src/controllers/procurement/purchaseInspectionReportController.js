const PurchaseInspectionForm = require('../../models/procurement/PurchaseInspectionForm');
const PurchaseInspectionReport = require('../../models/procurement/PurchaseInspectionReport');
const PurchaseOrder = require('../../models/procurement/PurchaseOrder');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const getAllPurchaseInspectionReports = asyncHandler(async (req, res) => {
  const purchaseInspectionReports = await PurchaseInspectionReport.find({
    organization: req.params.orgid,
  })
    .populate('form', ['title'])
    .populate('createdBy', ['email']);
  res.status(200).json({
    success: true,
    message: 'Purchase inspection reports fetched successfully',
    data: purchaseInspectionReports,
  });
});

const createPurchaseInspectionReport = asyncHandler(async (req, res) => {
  const {
    form,
    lat,
    lng,
    answers,
    createdBy,
    organization,
    company,
    isPassed,
  } = req.body;
  const purchaseInspectionReport = new PurchaseInspectionReport({
    form,
    lat,
    lng,
    answers,
    createdBy,
    organization,
    company,
    isPassed,
  });
  const savedPurchaseInspectionReport = await purchaseInspectionReport.save();
  res.status(201).json({
    success: true,
    message: 'Purchase inspection report created successfully',
    data: savedPurchaseInspectionReport,
  });
});

const getPurchaseInspectionReportById = asyncHandler(async (req, res) => {
  const purchaseInspectionReport = await PurchaseInspectionReport.findById(
    req.params.id
  )
    .populate('form', ['title'])
    .populate('createdBy', ['email']);
  res.json({
    success: true,
    message: 'Purchase inspection report fetched successfully',
    data: purchaseInspectionReport,
  });
});

const submitPurchaseInspectionReport = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const {
    lat,
    lng,
    answers,
    createdBy,
    organization,
    company,
    isPassed,
    purchaseOrder,
  } = req.body;

  // Check if the EmployeeReport exists
  const existingReport = await PurchaseInspectionForm.findById(formId);
  if (!existingReport) {
    throw new NotFoundError('Purchase inspection form not found');
  }

  // Create a new EmployeeReportSubmission
  const purchaseInspectionReport = new PurchaseInspectionReport({
    form: formId,
    lat,
    lng,
    answers,
    createdBy,
    organization,
    company,
    isPassed,
    purchaseOrder,
  });

  await PurchaseOrder.findByIdAndUpdate(
    purchaseOrder,
    {
      $set: {
        inspectionReport: purchaseInspectionReport._id,
        inspectionPassed: isPassed,
      },
    },
    { new: true }
  );

  // Save the submission
  const savedPurchaseInspectionReport = await purchaseInspectionReport.save();
  res.status(201).json({
    success: true,
    message: 'Purchase inspection report submitted successfully',
    data: savedPurchaseInspectionReport,
  });
});

const getPurchaseInspectionReportSubmissions = asyncHandler(
  async (req, res) => {
    const { reportId } = req.params;

    // Find the employee report
    const report = await PurchaseInspectionForm.findById(reportId);

    if (!report) {
      throw new NotFoundError('Purchase inspection form not found');
    }

    // Find all submissions for the report
    const submissions = await PurchaseInspectionReport.find({
      form: reportId,
    })
      .select('form inspectionDate createdBy')
      .populate({
        path: 'createdBy',
        select: 'fullName email', // Select only required fields
      });

    const formattedSubmissions = submissions.map((submission) => ({
      _id: submission._id,
      date: submission.inspectionDate,
      formName: report.title,
      createdBy: submission.createdBy
        ? {
            _id: submission.createdBy._id,
            name: `${submission.createdBy.fullName}`,
            email: submission.createdBy.email,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      message: 'Purchase inspection report submissions retrieved successfully',
      data: {
        submissions: formattedSubmissions,
      },
    });
  }
);

// Route to get a particular submission by ID and populate necessary fields
const getPurchaseInspectionReportSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await PurchaseInspectionReport.findById(submissionId)
    .populate({
      path: 'form',
      select: 'title',
    })
    .populate({
      path: 'createdBy',
      select: 'fullName email',
    });

  if (!submission) {
    throw new NotFoundError('Purchase inspection report submission not found');
  }

  res.status(200).json({
    success: true,
    message: 'Purchase inspection report submission retrieved successfully',
    data: { submission },
  });
});

module.exports = {
  getAllPurchaseInspectionReports,
  createPurchaseInspectionReport,
  getPurchaseInspectionReportById,
  submitPurchaseInspectionReport,
  getPurchaseInspectionReportSubmissions,
  getPurchaseInspectionReportSubmission,
};
