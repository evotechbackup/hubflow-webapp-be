const PurchaseInspectionForm = require('../../models/procurement/PurchaseInspectionForm');
const PurchaseInspectionReport = require('../../models/procurement/PurchaseInspectionReport');
const { default: mongoose } = require('mongoose');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const getAllPurchaseInspectionForms = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const purchaseInspectionForms = await PurchaseInspectionForm.find({
    organization: orgid,
  });
  res.status(200).json({
    success: true,
    message: 'Purchase inspection forms retrieved successfully',
    data: purchaseInspectionForms,
  });
});

const getAllPurchaseInspectionFormIds = asyncHandler(async (req, res) => {
  const purchaseInspectionForms = await PurchaseInspectionForm.find({
    organization: req.params.orgid,
  }).select('title');
  res.status(200).json({
    success: true,
    message: 'Purchase inspection forms retrieved successfully',
    data: purchaseInspectionForms,
  });
});

// Create a new employee report
const createPurchaseInspectionForm = asyncHandler(async (req, res) => {
  const newPurchaseInspectionForm = new PurchaseInspectionForm(req.body);
  const savedPurchaseInspectionForm = await newPurchaseInspectionForm.save();
  res.status(201).json({
    success: true,
    message: 'Purchase inspection form created successfully',
    data: savedPurchaseInspectionForm,
  });
});

//get by id
const getPurchaseInspectionFormById = asyncHandler(async (req, res) => {
  const purchaseInspectionForm = await PurchaseInspectionForm.findById(
    req.params.id
  );
  if (!purchaseInspectionForm) {
    throw new NotFoundError('Purchase inspection form not found');
  }
  res.status(200).json({
    success: true,
    message: 'Purchase inspection form retrieved successfully',
    data: purchaseInspectionForm,
  });
});

const getSubmissionCount = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const submissionCounts = await PurchaseInspectionReport.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
      },
    },
    {
      $group: {
        _id: '$form',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'purchaseinspectionforms',
        localField: '_id',
        foreignField: '_id',
        as: 'report',
      },
    },
    {
      $addFields: {
        report: { $arrayElemAt: ['$report', 0] },
      },
    },
    {
      $project: {
        _id: 1,
        count: 1,
        'report.title': 1,
      },
    },
  ]);

  res.json({
    success: true,
    message: 'Purchase inspection form submission count retrieved successfully',
    data: submissionCounts,
  });
});

module.exports = {
  getAllPurchaseInspectionForms,
  getAllPurchaseInspectionFormIds,
  createPurchaseInspectionForm,
  getPurchaseInspectionFormById,
  getSubmissionCount,
};
