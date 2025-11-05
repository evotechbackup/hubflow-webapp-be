const CRMAccounts = require('../../models/crm/CRMAccounts');
const { asyncHandler } = require('../../middleware/errorHandler');

const createAccount = asyncHandler(async (req, res) => {
  const { name, type, organization, company } = req.body;
  const newCRMAccounts = new CRMAccounts({
    name,
    type,
    organization,
    company,
  });
  await newCRMAccounts.save();
  res.status(201).json({
    success: true,
    message: 'accounts created successfully',
    data: newCRMAccounts,
  });
});

const getAccounts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const crmAccounts = await CRMAccounts.find({
    organization: orgid,
    isDeleted: false,
  });
  res.status(200).json({
    success: true,
    message: 'accounts retrieved successfully',
    data: crmAccounts,
  });
});

const updateAccountName = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const updatedCRMAccounts = await CRMAccounts.findByIdAndUpdate(
    id,
    { $set: { name } },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'accounts updated successfully',
    data: updatedCRMAccounts,
  });
});

const updateAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { leads, contacts } = req.body;
  const updatedCRMAccounts = await CRMAccounts.findByIdAndUpdate(
    id,
    { $set: { leads, contacts } },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'accounts updated successfully',
    data: updatedCRMAccounts,
  });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await CRMAccounts.findByIdAndUpdate(id, { isDeleted: true });
  res.status(200).json({
    success: true,
    Message: 'CRM Accounts deleted successfully',
    data: true,
  });
});

const getAccountById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const crmAccount = await CRMAccounts.findById(id)
    .populate('leads')
    .populate('contacts');
  res.status(200).json({
    success: true,
    message: 'crm retrived successfully ',
    data: crmAccount,
  });
});

module.exports = {
  createAccount,
  getAccounts,
  updateAccountName,
  updateAccount,
  deleteAccount,
  getAccountById,
};
