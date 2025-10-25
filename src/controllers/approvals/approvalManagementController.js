const ApprovalManagement = require('../../models/approvals/ApprovalManagement');
const mongoose = require('mongoose');
const { asyncHandler } = require('../../middleware/errorHandler');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const fixedFeatures = [
  // sales
  'quotation',
  'booking',
  'invoice',
  'paymentreceived',
  'proformainvoice',

  //   procurement
  'purchaserequisition',
  'rfq',
  'purchaseorder',
  'purchasereceives',
  'paymentrequest',
  'paymentvoucher',

  // hrm
  'payroll',
  'advance',
  'loan',
  'leavemanagement',
  'manpowertimesheet',
  'payrollvoucher',

  //   accounts
  'pettycashrequest',
  'pettycashclosing',
  'expenses',
  'expensevoucher',
  'pettycashvoucher',
  'creditnote',

  // recruit
  'offerletter',
];

const getApprovalManagement = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(orgid)) {
    throw new ValidationError('Invalid organization ID');
  }

  let approvalManagement = await ApprovalManagement.findOne({
    organization: orgid,
  });

  if (!approvalManagement) {
    approvalManagement = new ApprovalManagement({
      organization: orgid,
      approval: fixedFeatures.map((feature) => ({
        feature,
        reviewed: true,
        verified: true,
        acknowledged: true,
        approved1: true,
        approved2: true,
      })),
    });
    await approvalManagement.save();
  }

  const approvals = {};

  approvalManagement.approval.forEach((approval) => {
    approvals[approval.feature] = approval;
  });

  res.status(200).json({
    success: true,
    message: 'Approval management retrieved successfully',
    data: approvals,
  });
});

const updateApprovalManagement = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { approval } = req.body;

  const approvalManagement = await ApprovalManagement.findOne({
    organization: orgid,
  });

  if (!approvalManagement || !approval) {
    throw new NotFoundError('Approval management not found');
  }

  approvalManagement.approval = approval;

  await approvalManagement.save();
  res.status(200).json({
    success: true,
    message: 'Approval management updated successfully',
    data: approvalManagement,
  });
});

module.exports = {
  getApprovalManagement,
  updateApprovalManagement,
};
