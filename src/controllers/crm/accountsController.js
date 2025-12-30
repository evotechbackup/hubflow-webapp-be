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
  const { category_type, agentValue, status, country, search_query } =
    req.query;

  const matchQuery = {};
  if (
    category_type !== 'undefined' &&
    category_type !== null &&
    category_type !== ''
  ) {
    matchQuery.customerType = category_type;
  }

  if (status !== 'undefined' && status !== null && status !== '') {
    matchQuery.pipelineStatus = status;
  }

  if (country !== 'undefined' && country !== null && country !== '') {
    matchQuery.region = country;
  }

  if (agentValue !== 'undefined' && agentValue !== null && agentValue !== '') {
    matchQuery.assignedTo = agentValue;
  }

  if (
    search_query !== 'undefined' &&
    search_query !== null &&
    search_query !== ''
  ) {
    matchQuery.$or = [
      { fullName: { $regex: search_query, $options: 'i' } },
      { phone: { $regex: search_query, $options: 'i' } },
      { companyName: { $regex: search_query, $options: 'i' } },
      // { email: { $regex: search_query, $options: "i" } },
    ];
  }

  const crmAccount = await CRMAccounts.findById(id)
    .populate({
      path: 'leads',
      match: Object.keys(matchQuery).length ? matchQuery : {},
      populate: {
        path: 'assignedTo',
        select: 'firstName lastName',
      },
    })
    .populate({
      path: 'contacts',
      match: Object.keys(matchQuery).length ? matchQuery : {},
      populate: {
        path: 'assignedTo',
        select: 'firstName lastName',
      },
    });
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
