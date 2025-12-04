const LastInsertedId = require('../../models/master/LastInsertedID');
const RFP = require('../../models/procurement/RFP');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../utils/approvalUtils');
const { createActivityLog } = require('../../utils/logUtils');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const createRFP = asyncHandler(async (req, res) => {
  const orderId = req.params.orderId === '0' ? null : req.params.orderId;
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'rfp',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({ entity: 'rfp', organization });
  }
  if (id !== undefined && !isNaN(parseInt(id))) {
    lastInsertedId.lastId = parseInt(id);
    await lastInsertedId.save();
  } else {
    lastInsertedId.lastId += 1;
    await lastInsertedId.save();
  }
  const { prefix } = req.body;
  const salesOrderPrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }
  const {
    items,
    notes,
    type,
    date,
    requiredDate,
    employee,
    company,
    priorityStatus,
    expenseType,
    purpose,
    docAttached,
  } = req.body;
  const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  const hasApproval = await ifHasApproval('purchaserequisition', organization);

  const rfp = new RFP({
    items,
    employee,
    notes,
    type,
    order: orderId,
    id: customID ? customID : salesOrderPrefix + paddedId,
    date,
    requiredDate,
    company,
    organization,
    user: req.id,
    priorityStatus,
    expenseType,
    purpose,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
  });
  const data = await rfp.save();

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'rfp',
    actionId: data.id,
    organization: data.organization,
    company: data.company,
  });

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'purchaserequisition',
      'pending',
      data.organization,
      data.company,
      data.id,
      'RFP',
      'purchaserequisition',
      data._id
    );
  }

  res.status(201).json({
    success: true,
    message: 'RFP created successfully',
    data,
  });
});

const getRFPById = asyncHandler(async (req, res) => {
  const rfp = await RFP.findById(req.params.id)
    .populate({
      path: 'employee',
      populate: { path: 'department' },
    })
    .populate('items.itemId')
    .populate('items.itemsId')
    .populate('items.fleetId')
    .populate('user', ['signature', 'role', 'fullName', 'userName'])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName'])
    .populate('organization');

  if (!rfp) {
    throw new NotFoundError('RFP not found');
  }

  res.status(200).json({
    success: true,
    message: 'RFP fetched successfully',
    data: rfp,
  });
});

const approveRFP = asyncHandler(async (req, res) => {
  const updatedRFP = await RFP.findOneAndUpdate(
    { _id: req.params.id },
    { approval: 'accepted' },
    { new: true }
  );

  if (!updatedRFP) {
    throw new NotFoundError('RFP not found');
  }

  res.status(200).json({
    success: true,
    message: 'RFP approved successfully',
    data: updatedRFP,
  });
});

const rejectRFP = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;
  const updatedRFP = await RFP.findOneAndUpdate(
    { _id: req.params.id },
    { approval: 'rejected', approvalComment: approvalComment || null },
    { new: true }
  );

  if (!updatedRFP) {
    throw new NotFoundError('RFP not found');
  }

  res.status(200).json({
    success: true,
    message: 'RFP rejected successfully',
    data: updatedRFP,
  });
});

const updateRFPApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const rfp = await RFP.findById(id);
  if (!rfp) {
    throw new NotFoundError('RFP not found');
  }

  const resetFields = () => {
    rfp.verifiedBy = null;
    rfp.approvedBy1 = null;
    rfp.approvedBy2 = null;
    rfp.verifiedAt = null;
    rfp.approvedAt1 = null;
    rfp.approvedAt2 = null;
    rfp.reviewedBy = null;
    rfp.reviewedAt = null;
    rfp.acknowledgedBy = null;
    rfp.acknowledgedAt = null;
  };

  rfp.approval = approval;
  switch (approval) {
    case 'reviewed':
      rfp.reviewedBy = req.id || null;
      rfp.reviewedAt = new Date();
      rfp.verifiedBy = null;
      rfp.verifiedAt = null;
      rfp.acknowledgedBy = null;
      rfp.acknowledgedAt = null;
      break;
    case 'verified':
      rfp.verifiedBy = req.id || null;
      rfp.verifiedAt = new Date();
      rfp.acknowledgedBy = null;
      rfp.acknowledgedAt = null;
      break;
    case 'acknowledged':
      rfp.acknowledgedBy = req.id || null;
      rfp.acknowledgedAt = new Date();
      break;
    case 'approved1':
      rfp.approvedBy1 = req.id || null;
      rfp.approvedAt1 = new Date();
      break;
    case 'approved2':
      rfp.approvedBy2 = req.id || null;
      rfp.approvedAt2 = new Date();
      break;
    case 'correction':
      rfp.approvalComment = approvalComment || null;
      resetFields();
      break;
    default:
      break;
  }
  const updatedRFP = await rfp.save();

  await findNextApprovalLevelAndNotify(
    'purchaserequisition',
    approval,
    updatedRFP.organization,
    updatedRFP.company,
    updatedRFP.id,
    'RFP',
    'purchaserequisition',
    updatedRFP._id
  );

  await createActivityLog({
    userId: req.id,
    action: approval.includes('approve') ? 'approve' : approval,
    type: 'rfp',
    actionId: updatedRFP.id,
    organization: updatedRFP.organization,
    company: updatedRFP.company,
  });

  res.status(200).json({
    success: true,
    message: 'RFP approval updated successfully',
    data: updatedRFP,
  });
});

const changeValidation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { valid } = req.body;
  const rfp = await RFP.findByIdAndUpdate(
    id,
    {
      $set: {
        valid,
      },
    },
    { new: true }
  );

  if (!rfp) {
    throw new NotFoundError('RFP not found');
  }

  await createActivityLog({
    userId: req.id,
    action: 'invalidate',
    type: 'rfp',
    actionId: rfp.id,
    organization: rfp.organization,
    company: rfp.company,
  });

  res.status(200).json({
    success: true,
    message: 'RFP validation updated successfully',
    data: rfp,
  });
});

const updateRFP = asyncHandler(async (req, res) => {
  const updatedrfp = await RFP.findOneAndUpdate(
    { _id: req.params.id },
    { ...req.body },
    { new: true }
  );

  if (!updatedrfp) {
    throw new NotFoundError('RFP not found');
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'rfp',
    actionId: updatedrfp.id,
    organization: updatedrfp.organization,
    company: updatedrfp.company,
  });

  res.status(200).json({
    success: true,
    message: 'RFP updated successfully',
    data: updatedrfp,
  });
});

const reviseRFP = asyncHandler(async (req, res) => {
  const rfp = await RFP.findById(req.params.id);

  if (!rfp) {
    throw new NotFoundError('RFP not found');
  }

  const baseId = rfp.id.split('-REV')[0];
  const currentRevision = rfp.id.includes('-REV')
    ? parseInt(rfp.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  const updatedrfp = await RFP.findByIdAndUpdate(
    req.params.id,
    { ...req.body, id: newId },
    { new: true }
  );

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'rfp',
    actionId: updatedrfp.id,
    organization: updatedrfp.organization,
    company: updatedrfp.company,
  });

  res.status(200).json({
    success: true,
    message: 'RFP revised successfully',
    data: updatedrfp,
  });
});

const filterRFPs = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    filter_validity,
    filter_approval,
    search_query = '',
    startDate,
    endDate,
    page = 1,
    limit = 25,
    sort_by = 'date',
    sort_order = 'desc',
  } = req.query;

  const dateFilter = {};
  if (startDate !== 'undefined' && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate !== 'undefined' && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    organization: orgid,
  };

  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }
  if (
    startDate &&
    startDate !== 'undefined' &&
    startDate !== 'null' &&
    endDate &&
    endDate !== 'undefined' &&
    endDate !== 'null'
  ) {
    query.date = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [{ path: 'employee', select: 'firstName' }],
  };

  const result = await RFP.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'RFP fetched successfully',
    data: {
      rfp: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalRfp: result.totalDocs,
    },
  });
});

const filterRFPsWithoutPagination = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    filter_validity,
    filter_approval,
    search_query = '',
    startDate,
    endDate,
    sort_by = 'date',
    sort_order = 'desc',
  } = req.query;

  const dateFilter = {};
  if (startDate !== 'undefined' && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate !== 'undefined' && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    organization: orgid,
  };

  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }
  if (
    startDate &&
    startDate !== 'undefined' &&
    startDate !== 'null' &&
    endDate &&
    endDate !== 'undefined' &&
    endDate !== 'null'
  ) {
    query.date = dateFilter;
  }

  const rfp = await RFP.find(query)
    .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 })
    .select('date id employee priorityStatus approval createdAt valid')
    .populate({ path: 'employee', select: 'firstName' });

  res.status(200).json({
    success: true,
    message: 'RFP fetched successfully',
    data: {
      rfp,
      totalRfp: rfp.length,
    },
  });
});

const filterRFPsByAgent = asyncHandler(async (req, res) => {
  const {
    filter_validity,
    filter_approval,
    search_query = '',
    startDate,
    endDate,
    page = 1,
    limit = 25,
    sort_by = 'date',
    sort_order = 'desc',
  } = req.query;

  const dateFilter = {};
  if (startDate !== 'undefined' && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate !== 'undefined' && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    agent: req.id,
  };

  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }
  if (
    startDate &&
    startDate !== 'undefined' &&
    startDate !== 'null' &&
    endDate &&
    endDate !== 'undefined' &&
    endDate !== 'null'
  ) {
    query.date = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [{ path: 'employee', select: 'firstName' }],
  };

  const result = await RFP.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'RFP fetched successfully',
    data: {
      rfp: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalRfp: result.totalDocs,
    },
  });
});

const getRFPListForRFQ = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const rfp = await RFP.find({
    organization: orgid,
    rfqCreated: false,
    poCreated: false,
  }).select('id items');

  res.status(200).json({
    success: true,
    message: 'RFP list fetched successfully',
    data: rfp,
  });
});

const deleteRFP = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rfp = await RFP.findByIdAndDelete(id);

  if (!rfp) {
    throw new NotFoundError('RFP not found');
  }

  res.status(200).json({
    success: true,
    message: 'RFP deleted successfully',
    data: rfp,
  });
});

const checkExistId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { chanageId } = req.query;

  const rfp = await RFP.findOne({
    organization: orgid,
    id: chanageId,
  });

  if (rfp) {
    return res.status(400).json({
      success: false,
      message: 'This ID already exists',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'ID is available',
  });
});

module.exports = {
  createRFP,
  getRFPById,
  approveRFP,
  rejectRFP,
  updateRFPApproval,
  changeValidation,
  updateRFP,
  reviseRFP,
  filterRFPs,
  filterRFPsWithoutPagination,
  filterRFPsByAgent,
  getRFPListForRFQ,
  deleteRFP,
  checkExistId,
};
