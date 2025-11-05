const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Lead = require('../../models/crm/Leads');
const CRMContacts = require('../../models/crm/CRMContacts');
const Employee = require('../../models/hrm/Employee');
const CRMAccounts = require('../../models/crm/CRMAccounts');
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

const addComment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;

  const lead = await Lead.findById(id);
  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  const updatedLeads = await Lead.findByIdAndUpdate(
    id,
    {
      $set: { companyName: lead.companyName },
      $push: { comments: { comment, date: Date.now() } },
    },
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
  addComment,
  changepipeline,
  uploadFile,
};
