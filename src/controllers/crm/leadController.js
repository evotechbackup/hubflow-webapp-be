const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Lead = require('../../models/crm/Leads');
const Employee = require('../../models/hrm/Employee');
const CRMAccounts = require('../../models/crm/CRMAccounts');
// const { createActivityLog } = require("../../utilities/logUtils");

const createLead = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    fullName,
    displayName,
    email,
    companyName,
    phone,
    customerType,
    industry,
    region,
    source,
    description,
    website,
    alternatePhone,
    account,
    agentEmail,
    organization,
    company,
  } = req.body;
  const employee = await Employee.findOne({ email: agentEmail });

  const lead = new Lead({
    firstName,
    lastName,
    fullName,
    displayName,
    email,
    companyName,
    phone,
    customerType,
    industry,
    region,
    source,
    description,
    website,
    alternatePhone,
    account,
    logs: [{ status: 'new', agent: req?._id, date: new Date() }],
    organization,
    company,
    assignedTo: employee ? [employee?._id] : [],
  });
  const savedLeads = await lead.save();
  if (account) {
    const account = await CRMAccounts.findById(account);
    account.leads.push(savedLeads._id);
    await account.save();
  }

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: savedLeads,
  });
});

const getAllLeads = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const leads = await Lead.find({
    organization: orgid,
  })
    .populate('assignedTo', ['firstName', 'lastName'])
    .populate('account', ['name']);
  res.status(200).json({
    success: true,
    message: 'Leads fetched successfully',
    data: leads,
  });
});

const getLead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const lead = await Lead.findById(id)
    .populate('assignedTo', ['firstName', 'lastName'])
    .populate('account', ['name']);

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  res.status(200).json({
    success: true,
    message: 'Lead retrieved successfully',
    data: lead,
  });
});

const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedLeads = await Lead.findByIdAndUpdate(id, {
    $set: req.body,
  });

  if (!updatedLeads) {
    throw new NotFoundError('Lead not found');
  }
  if (
    req.body.account &&
    req.body.account !== updatedLeads.account?.toString()
  ) {
    const previousAccount = await CRMAccounts.findById(updatedLeads.account);
    if (previousAccount) {
      previousAccount.leads = previousAccount.leads.filter(
        (lead) => lead.toString() !== updatedLeads._id.toString()
      );
      await previousAccount.save();
    }

    const account = await CRMAccounts.findById(req.body.account);
    account.leads.push(updatedLeads._id);
    await account.save();
  }

  res.status(200).json({
    success: true,
    message: 'Lead updated successfully',
    data: updatedLeads,
  });
});

const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lead = await Lead.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
    },
    { new: true }
  );

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  res.status(200).json({
    success: true,
    message: 'Lead deleted successfully',
    data: lead,
  });
});

const getLeadsWithoutCustomers = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const leads = await Lead.find({ organization: orgid, isCustomer: false });
  res.status(200).json({
    success: true,
    message: 'Leads fetched successfully',
    data: leads,
  });
});

const assignedTo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { employeeId } = req.body;

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new NotFoundError('Lead not found');
  }
  const isAssigned = lead.assignedTo.includes(employeeId);

  const updateOperation = isAssigned
    ? { $pull: { assignedTo: employeeId } }
    : { $push: { assignedTo: employeeId } };

  const updatedLeads = await Lead.findByIdAndUpdate(id, updateOperation, {
    new: true,
  });
  res.status(200).json({
    success: true,
    message: 'Lead assigned successfully',
    data: updatedLeads,
  });
});

const deleteFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentId } = req.params;

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new NotFoundError('Lead not found');
  }
  const documentIndex = lead.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the lead');
  }

  lead.files.splice(documentIndex, 1);

  await lead.save();
  res.status(200).json({
    success: true,
    message: 'Files deleted successfully',
    data: lead,
  });
});

const updateFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentId } = req.params;

  const { name, notify, expiryDate, reminderDate } = req.body;

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  const documentIndex = lead.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the lead');
  }

  lead.files[documentIndex].name = name;
  lead.files[documentIndex].notify = notify;
  lead.files[documentIndex].expiryDate = expiryDate;
  lead.files[documentIndex].reminderDate = reminderDate;

  await lead.save();
  res.status(200).json({
    success: true,
    message: 'Files upadted successfully',
    data: lead,
  });
});

const getFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existingLeads = await Lead.findById(id);
  const documents = existingLeads.files;
  res.status(200).json({
    success: true,
    message: 'Files fetched successfully',
    data: documents,
  });
});

module.exports = {
  createLead,
  getAllLeads,
  updateLead,
  deleteLead,
  getLead,
  getLeadsWithoutCustomers,
  assignedTo,
  deleteFiles,
  updateFiles,
  getFiles,
};
