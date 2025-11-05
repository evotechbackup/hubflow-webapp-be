const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Contact = require('../../models/crm/CRMContacts');
const Employee = require('../../models/hrm/Employee');
const CRMAccounts = require('../../models/crm/CRMAccounts');
// const { createActivityLog } = require("../../utilities/logUtils");

const createContact = asyncHandler(async (req, res) => {
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

  const contact = new Contact({
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
  const savedContact = await contact.save();
  if (account) {
    const account = await CRMAccounts.findById(account);
    account.contacts.push(savedContact._id);
    await account.save();
  }

  res.status(201).json({
    success: true,
    message: 'Contact created successfully',
    data: savedContact,
  });
});

const getAllContacts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const contacts = await Contact.find({
    organization: orgid,
  }).populate('assignedTo', ['firstName', 'lastName']);
  res.status(200).json({
    success: true,
    message: 'Contacts fetched successfully',
    data: contacts,
  });
});

const getContact = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const contact = await Contact.findById(id)
    .populate('assignedTo', ['firstName', 'lastName'])
    .populate('account', ['name'])
    .populate('logs.agent', 'fullName');

  if (!contact) {
    throw new NotFoundError('Contact not found');
  }

  res.status(200).json({
    success: true,
    message: 'Contact retrieved successfully',
    data: contact,
  });
});

const updateContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updatedContact = await Contact.findByIdAndUpdate(id, {
    $set: req.body,
  });

  if (!updatedContact) {
    throw new NotFoundError('Contact not found');
  }
  if (
    req.body.account &&
    req.body.account !== updatedContact.account?.toString()
  ) {
    const previousAccount = await CRMAccounts.findById(updatedContact.account);
    if (previousAccount) {
      previousAccount.contacts = previousAccount.contacts.filter(
        (contact) => contact.toString() !== updatedContact._id.toString()
      );
      await previousAccount.save();
    }

    const account = await CRMAccounts.findById(req.body.account);
    account.contacts.push(updatedContact._id);
    await account.save();
  }

  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: updatedContact,
  });
});

const deleteContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contact = await Contact.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
    },
    { new: true }
  );

  if (!contact) {
    throw new NotFoundError('Contact not found');
  }

  res.status(200).json({
    success: true,
    message: 'Contact deleted successfully',
    data: contact,
  });
});

const changePipeline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { pipelineStatus } = req.body;
  const updatedContact = await Contact.findByIdAndUpdate(
    id,
    {
      $set: { pipelineStatus },
      $push: {
        logs: { status: pipelineStatus, agent: req._id, date: new Date() },
      },
    },
    { new: true }
  );

  if (!updatedContact) {
    throw new NotFoundError('Contact not found');
  }

  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: updatedContact,
  });
});

const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  const updatedContact = await Contact.findByIdAndUpdate(
    id,
    { $push: { comments: { comment, date: Date.now() } } },
    { new: true }
  );

  if (!updatedContact) {
    throw new NotFoundError('Contact not found');
  }

  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: updatedContact,
  });
});

const getContactsWithoutCustomers = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const contacts = await Contact.find({
    organization: orgid,
    isCustomer: false,
  });
  res.status(200).json({
    success: true,
    message: 'Contacts fetched successfully',
    data: contacts,
  });
});

const assignedTo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { employeeId } = req.body;

  const contact = await Contact.findById(id);
  const isAssigned = contact.assignedTo.includes(employeeId);

  const updateOperation = isAssigned
    ? { $pull: { assignedTo: employeeId } } // Remove if present
    : { $push: { assignedTo: employeeId } }; // Add if not present

  const updatedContact = await Contact.findByIdAndUpdate(id, updateOperation, {
    new: true,
  });
  res.status(200).json({
    success: true,
    message: 'Contact assigned successfully',
    data: updatedContact,
  });
});

const deleteFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentId } = req.params;

  const contact = await Contact.findById(id);
  if (!contact) {
    throw new NotFoundError('Contact not found');
  }
  const documentIndex = contact.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the lead');
  }

  contact.files.splice(documentIndex, 1);

  await contact.save();
  res.status(200).json({
    success: true,
    message: 'Files deleted successfully',
    data: contact,
  });
});

const updateFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { documentId } = req.params;

  const { name, notify, expiryDate, reminderDate } = req.body;

  const contact = await Contact.findById(id);
  if (!contact) {
    throw new NotFoundError('Contact not found');
  }

  const documentIndex = contact.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the lead');
  }

  contact.files[documentIndex].name = name;
  contact.files[documentIndex].notify = notify;
  contact.files[documentIndex].expiryDate = expiryDate;
  contact.files[documentIndex].reminderDate = reminderDate;

  await contact.save();
  res.status(200).json({
    success: true,
    message: 'Files upadted successfully',
    data: contact,
  });
});

const getFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existingContact = await Contact.findById(id);
  const documents = existingContact.files;
  res.status(200).json({
    success: true,
    message: 'Files fetched successfully',
    data: {documents},
  });
});

module.exports = {
  createContact,
  getAllContacts,
  updateContact,
  deleteContact,
  getContact,
  getContactsWithoutCustomers,
  assignedTo,
  deleteFiles,
  updateFiles,
  getFiles,
  addComment,
  changePipeline,
};
