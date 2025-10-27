const EmployeeReport = require('../../models/hrm/Reports/EmployeeReport');
const EmployeeReportSubmission = require('../../models/hrm/Reports/EmployeeReportSubmission');
const { asyncHandler } = require('../../middleware/errorHandler');
// const { createActivityLog } = require('../../../utilities/logUtils');

const getEmployeeReportSubmissions = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const employeeReportSubmissions = await EmployeeReportSubmission.find({
    organization: orgid,
  })
    .populate('form', ['title'])
    .populate('department', ['name'])
    .populate('createdBy', ['email']);
  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: employeeReportSubmissions,
  });
});

const createEmployeeReportSubmission = asyncHandler(async (req, res) => {
  const {
    form,
    department,
    role,
    lat,
    lng,
    answers,
    createdBy,
    organization,
    company,
  } = req.body;
  const employeeReportSubmission = new EmployeeReportSubmission({
    form,
    department,
    role,
    lat,
    lng,
    answers,
    createdBy,
    organization,
    company,
  });
  const savedEmployeeReportSubmission = await employeeReportSubmission.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'employeeReportSubmission',
  //   actionId: '',
  //   organization: organization,
  //     company: company,
  //   });

  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: savedEmployeeReportSubmission,
  });
});

const getEmployeeReportSubmissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employeeReportSubmission = await EmployeeReportSubmission.findById(id)
    .populate('form', ['title'])
    .populate('department', ['name'])
    .populate('createdBy', ['email']);
  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: employeeReportSubmission,
  });
});

const submitEmployeeReport = asyncHandler(async (req, res) => {
  const { formId } = req.params;
  const {
    department,
    role,
    lat,
    lng,
    answers,
    createdBy,
    organization,
    company,
  } = req.body;

  // Check if the EmployeeReport exists
  const existingReport = await EmployeeReport.findById(formId);
  if (!existingReport) {
    throw new Error('EmployeeReport not found');
  }

  // Create a new EmployeeReportSubmission
  const employeeReportSubmission = new EmployeeReportSubmission({
    form: formId,
    department,
    role,
    lat,
    lng,
    answers,
    createdBy,
    organization,
    company,
  });

  // Save the submission
  const savedEmployeeReportSubmission = await employeeReportSubmission.save();
  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: savedEmployeeReportSubmission,
  });
});

// Route to get all submissions for a particular employee report
const getEmployeeReportSubmissionsByReportId = asyncHandler(
  async (req, res) => {
    const { reportId } = req.params;

    // Find the employee report
    const report = await EmployeeReport.findById(reportId);

    if (!report) {
      throw new Error('Employee report not found');
    }

    // Find all submissions for the report
    const submissions = await EmployeeReportSubmission.find({ form: reportId })
      .select('form department role inspectionDate createdBy')
      .populate({
        path: 'createdBy',
        select: 'firstName lastName email', // Select only required fields
      })
      .populate({
        path: 'department',
        select: 'name',
      });

    const formattedSubmissions = submissions.map((submission) => ({
      _id: submission._id,
      date: submission.inspectionDate,
      department: submission.department,
      role: submission.role,
      formName: report.title,
      createdBy: submission.createdBy
        ? {
            _id: submission.createdBy._id,
            name: `${submission.createdBy.firstName} ${submission.createdBy.lastName}`,
            email: submission.createdBy.email,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      message: 'Employee report retrieved successfully',
      data: formattedSubmissions,
    });
  }
);

// Route to get a particular submission by ID and populate necessary fields
const getEmployeeReportSubmissionByReportId = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await EmployeeReportSubmission.findById(submissionId)
    .populate({
      path: 'form',
      select: 'title',
    })
    .populate({
      path: 'department',
      select: 'name',
    })
    .populate({
      path: 'createdBy',
      select: 'firstName lastName email',
    });

  if (!submission) {
    throw new Error('Submission not found');
  }

  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: submission,
  });
});

module.exports = {
  createEmployeeReportSubmission,
  getEmployeeReportSubmissions,
  getEmployeeReportSubmissionById,
  submitEmployeeReport,
  getEmployeeReportSubmissionsByReportId,
  getEmployeeReportSubmissionByReportId,
};
