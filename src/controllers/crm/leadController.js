const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Lead = require('../../models/crm/Leads');
const Deals = require('../../models/crm/Deals');
const CRMContacts = require('../../models/crm/CRMContacts');
const CRMTasks = require('../../models/crm/CRMTasks');
const Employee = require('../../models/hrm/Employee');
const CRMAccounts = require('../../models/crm/CRMAccounts');
const mongoose = require('mongoose');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// const { createActivityLog } = require("../../utilities/logUtils");

const bucketname = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey,
  },
  region: bucketRegion,
});

const createLead = asyncHandler(async (req, res) => {
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

  const lead = new Lead({
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
    logs: [{ status: 'new', agent: req?._id, date: new Date() }],
    organization,
    company,
    socialMedia,
    assignedTo: employee ? [employee?._id] : [],
  });
  const savedLeads = await lead.save();
  if (account && account !== '') {
    const accountDoc = await CRMAccounts.findById(account);
    if (accountDoc) {
      accountDoc.leads.push(savedLeads._id);
      await accountDoc.save();
    }
  }

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: savedLeads,
  });
});

const bulkEdit = asyncHandler(async (req, res) => {
  const {
    leadListId,
    categoryType,
    account,
    industry,
    subindustry,
    region,
    source,
  } = req.body;

  if (!leadListId || !Array.isArray(leadListId) || leadListId.length === 0) {
    throw new NotFoundError('Please provide lead IDs to update');
  }
  const invalidIds = leadListId.filter(
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
  const result = await Lead.updateMany(
    { _id: { $in: leadListId } },
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
  const { leadListId, assignedTo } = req.body;

  if (!leadListId || !Array.isArray(leadListId) || leadListId.length === 0) {
    throw new NotFoundError('Please provide lead IDs to update');
  }
  const invalidIds = leadListId.filter(
    (id) => !mongoose.Types.ObjectId.isValid(id)
  );
  if (invalidIds.length > 0) {
    throw new NotFoundError('Invalid lead ID(s) provided');
  }
  const updateData = {};
  if (assignedTo) updateData.assignedTo = assignedTo;
  const result = await Lead.updateMany(
    { _id: { $in: leadListId } },
    { $addToSet: { assignedTo } }
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

const getAllLeads = asyncHandler(async (req, res) => {
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

  const leads = await Lead.find(matchQuery).populate('assignedTo', [
    'firstName',
    'lastName',
  ]);
  res.status(200).json({
    success: true,
    message: 'Leads fetched successfully',
    data: leads,
  });
});

const getLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const lead = await Lead.findById(id)
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
  res.status(200).json({
    success: true,
    message: 'Lead retrieved successfully',
    data: lead,
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

  const updatedLeads = await Lead.findByIdAndUpdate(
    id,
    { $push: { comments: newComment } },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'added',
    data: updatedLeads,
  });
});

const editComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { commentId, comment, agent } = req.body;

  const lead = await Lead.findOne({ _id: id, 'comments._id': commentId });

  if (!lead) {
    throw new NotFoundError('Lead not found or comment does not exist');
  }

  const commentToUpdate = lead.comments.find(
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

  const updatedLeads = await Lead.findOneAndUpdate(
    { _id: id, 'comments._id': commentId },
    updateQuery,
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'added',
    data: updatedLeads,
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
    req.body.account !== '' &&
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
  console.log('e,mpl', employeeId);

  const uniqueEmployeeIds = [...new Set(employeeId)];

  const updatedLeads = await Lead.findByIdAndUpdate(
    id,
    { assignedTo: uniqueEmployeeIds },
    { new: true }
  );

  if (!updatedLeads) {
    throw new NotFoundError('Lead not found');
  }
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
  console.log('id', id);
  const existingLeads = await Lead.findById(id);
  const documents = existingLeads.files;
  res.status(200).json({
    success: true,
    message: 'Files fetched successfully',
    data: { documents },
  });
});

const changepipeline = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { pipelineStatus } = req.body;
  const updatedLeads = await Lead.findByIdAndUpdate(
    id,
    {
      $set: { pipelineStatus },
      $push: {
        logs: { status: pipelineStatus, agent: req._id, date: new Date() },
      },
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'all leads fetched',
    data: updatedLeads,
  });
});

const uploadFile = asyncHandler(async (req, res) => {
  try {
    // Extracting data from the request body
    const { filename } = req.body;

    // Constructing S3 parameters
    const params = {
      Bucket: bucketname,
      Key: filename, // Using the name from the request body
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    // Creating a new PutObjectCommand
    const command = new PutObjectCommand(params);

    // Sending the command to S3
    await s3.send(command);

    if (req.params.type === 'leads') {
      await Lead.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            files: {
              name: req.body.name,
              filename: req.body.filename,
              notify: req.body.notify,
              expiryDate: req.body.expiryDate,
              reminderDate: req.body.reminderDate,
            },
          },
        },
        { new: true }
      );
    } else if (req.params.type === 'contacts') {
      await CRMContacts.findByIdAndUpdate(
        req.params.id,
        {
          $push: {
            files: {
              name: req.body.name,
              filename: req.body.filename,
              notify: req.body.notify,
              expiryDate: req.body.expiryDate,
              reminderDate: req.body.reminderDate,
            },
          },
        },
        { new: true }
      );
    }

    // if (req.body.notify === "true" && req.body.department !== "undefined") {
    //   const users = await Agent.find({
    //     department: req.body.department,
    //     // extracting users with profleType having admin keyword
    //     profileType: { $regex: "admin", $options: "i" },
    //   });
    //   for (const user of users) {
    //     const notification = new Notification({
    //       agent: user._id,
    //       title: `Document ${req.body.filename} expires`,
    //       body: `Document ${req.body.filename} expires on ${new Date(
    //         req.body.expiryDate
    //       ).toLocaleDateString()}`,
    //       type: "document",
    //       dueDate: new Date(req.body.expiryDate),
    //       reminderDate: new Date(req.body.reminderDate),
    //     });
    //     await notification.save();
    //   }
    // }

    res.status(200).json({
      success: true,
      message: 'uploaded successfully',
      data: 'success',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const getLeadsDeals = asyncHandler(async (req, res) => {
  const leadId = req.params.id;
  const leaddeals = await Deals.find({ lead: leadId });
  res.status(200).json({
    success: true,
    message: 'Lead retrieved successfully',
    data: leaddeals,
  });
});

const getLeadsMeetings = asyncHandler(async (req, res) => {
  const leadId = req.params.id;
  const leadmeeting = await CRMTasks.find({ leads: leadId });
  res.status(200).json({
    success: true,
    message: 'Lead retrieved successfully',
    data: leadmeeting,
  });
});

module.exports = {
  createLead,
  bulkEdit,
  bulkassign,
  editComment,
  getAllLeads,
  updateLead,
  deleteLead,
  getLead,
  getLeadsWithoutCustomers,
  assignedTo,
  deleteFiles,
  updateFiles,
  getFiles,
  addComment,
  changepipeline,
  uploadFile,
  getLeadsDeals,
  getLeadsMeetings,
};
