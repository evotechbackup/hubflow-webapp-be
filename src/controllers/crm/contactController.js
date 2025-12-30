const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Contact = require('../../models/crm/CRMContacts');
const Employee = require('../../models/hrm/Employee');
const CRMAccounts = require('../../models/crm/CRMAccounts');
const Deals = require('../../models/crm/Deals');
const CRMTasks = require('../../models/crm/CRMTasks');
const mongoose = require('mongoose');
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
    categoryType,
    industry,
    subindustry,
    region,
    source,
    description,
    website,
    alternatePhone,
    account,
    agentEmail,
    organization,
    company,
    socialMedia,
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
    categoryType,
    assignedTo: employee ? [employee?._id] : [],
    organization,
    company,
    industry,
    subindustry,
    region,
    source,
    description,
    website,
    alternatePhone,
    account,
    socialMedia,
    logs: [{ status: 'new', agent: req?._id, date: new Date() }],
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

const bulkEdit = asyncHandler(async (req, res) => {
  const {
    contactListId,
    categoryType,
    account,
    industry,
    subindustry,
    region,
    source,
  } = req.body;

  if (
    !contactListId ||
    !Array.isArray(contactListId) ||
    contactListId.length === 0
  ) {
    throw new NotFoundError('Please provide lead IDs to update');
  }
  const invalidIds = contactListId.filter(
    (id) => !mongoose.Types.ObjectId.isValid(id)
  );
  if (invalidIds.length > 0) {
    throw new NotFoundError('Invalid lead ID(s) provided');
  }
  const updateData = {};
  if (categoryType) updateData.categoryType = categoryType;
  if (account !== undefined) updateData.account = account;
  if (industry) updateData.industry = industry;
  if (subindustry) updateData.subindustry = subindustry;
  if (region) updateData.region = region;
  if (source) updateData.source = source;
  const result = await Contact.updateMany(
    { _id: { $in: contactListId } },
    { $set: updateData }
  );
  res.status(200).json({
    success: true,
    message: 'Lead retrieved successfully',
    data: {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    },
  });
});

const bulkassign = asyncHandler(async (req, res) => {
  const { contactListId, assignedTo } = req.body;

  if (
    !contactListId ||
    !Array.isArray(contactListId) ||
    contactListId.length === 0
  ) {
    throw new NotFoundError('Please provide lead IDs to update');
  }
  const invalidIds = contactListId.filter(
    (id) => !mongoose.Types.ObjectId.isValid(id)
  );
  if (invalidIds.length > 0) {
    throw new NotFoundError('Invalid lead ID(s) provided');
  }
  const updateData = {};
  if (assignedTo) updateData.assignedTo = assignedTo;
  const result = await Contact.updateMany(
    { _id: { $in: contactListId } },
    { $addToSet: { assignedTo } }
  );
  res.status(200).json({
    success: true,
    message: 'Contact retrieved successfully',
    data: {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    },
  });
});

const getAllContacts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    category_type,
    agentValue,
    status,
    country,
    search_query,
    accountValue,
  } = req.query;

  const matchQuery = { organization: orgid };

  if (
    category_type !== undefined &&
    category_type !== null &&
    category_type !== ''
  ) {
    matchQuery.categoryType = category_type;
  }

  if (status !== undefined && status !== null && status !== '') {
    matchQuery.pipelineStatus = status;
  }

  if (country !== undefined && country !== null && country !== '') {
    matchQuery.region = country;
  }

  if (
    accountValue !== undefined &&
    accountValue !== null &&
    accountValue !== ''
  ) {
    matchQuery.account = accountValue;
  }

  if (agentValue !== undefined && agentValue !== null && agentValue !== '') {
    matchQuery.assignedTo = agentValue;
  }

  if (
    search_query !== undefined &&
    search_query !== null &&
    search_query !== ''
  ) {
    matchQuery.$or = [
      { firstName: { $regex: search_query, $options: 'i' } },
      { lastName: { $regex: search_query, $options: 'i' } },
      { phone: { $regex: search_query, $options: 'i' } },
      { companyName: { $regex: search_query, $options: 'i' } },
    ];
  }

  const crmContacts = await Contact.find(matchQuery).populate('assignedTo', [
    'firstName',
    'lastName',
  ]);
  res.status(200).json({
    success: true,
    message: 'Contacts fetched successfully',
    data: crmContacts,
  });
});

const getContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contact = await Contact.findById(id)
    .populate('account', 'name')
    .populate({
      path: 'assignedTo',
      select: 'firstName lastName employeeId email role department location',
      populate: {
        path: 'department',
        select: 'name code',
      },
    })
    .populate('logs.agent', 'fullName')
    .populate('comments.permanent.createdBy', 'fullName email')
    .populate('comments.current.createdBy', 'fullName email');

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
  const { comment, agent } = req.body;
  const newComment = {
    permanent: {
      comment,
      date: Date.now(),
      createdBy: agent,
    },
    current: {
      comment,
      isEdited: false,
      editedAt: null,
      createdBy: agent,
    },
  };
  const updatedCRMContacts = await Contact.findByIdAndUpdate(
    id,
    { $push: { comments: newComment } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Contact updated successfully',
    data: updatedCRMContacts,
  });
});

const editComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { commentId, comment, agent } = req.body;

  const contact = await Contact.findOne({ _id: id, 'comments._id': commentId });

  if (!Contact) {
    throw new NotFoundError('Contact not found or comment does not exist');
  }

  const commentToUpdate = contact.comments.find(
    (c) => c._id.toString() === commentId
  );

  const hasCurrentComment = commentToUpdate?.current?.comment;

  let updateQuery;

  if (hasCurrentComment) {
    updateQuery = {
      $set: {
        'comments.$.current.comment': comment,
        'comments.$.current.editedAt': Date.now(),
        'comments.$.current.isEdited': true,
        'comments.$.current.createdBy': agent,
      },
    };
  } else {
    updateQuery = {
      $set: {
        'comments.$.current': {
          comment,
          editedAt: Date.now(),
          isEdited: true,
        },
      },
    };
  }

  const updatedContacts = await Contact.findOneAndUpdate(
    { _id: id, 'comments._id': commentId },
    updateQuery,
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'added',
    data: updatedContacts,
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

  const uniqueEmployeeIds = [...new Set(employeeId)];

  const updatedContacts = await Contact.findByIdAndUpdate(
    id,
    { assignedTo: uniqueEmployeeIds },
    { new: true }
  );

  if (!updatedContacts) {
    throw new NotFoundError('Contact not found');
  }
  res.status(200).json({
    success: true,
    message: 'Contact assigned successfully',
    data: updatedContacts,
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
    data: { documents },
  });
});

const getCRMContactsDeals = asyncHandler(async (req, res) => {
  const contactId = req.params.id;
  const contactdeals = await Deals.find({ contact: contactId });
  res.status(200).json({
    success: true,
    message: 'Lead retrieved successfully',
    data: contactdeals,
  });
});

const getCRMContactsMeeting = asyncHandler(async (req, res) => {
  const contactsId = req.params.id;
  const crmmeeting = await CRMTasks.find({ contacts: contactsId });
  res.status(200).json({
    success: true,
    message: 'Lead retrieved successfully',
    data: crmmeeting,
  });
});

module.exports = {
  createContact,
  getAllContacts,
  bulkEdit,
  bulkassign,
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
  getCRMContactsDeals,
  getCRMContactsMeeting,
  editComment,
};
