const RFQ = require('../../models/procurement/RFQ');
const LastInsertedId = require('../../models/master/LastInsertedID');
const Vendors = require('../../models/procurement/Vendor');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../utils/approvalUtils');
const RFP = require('../../models/procurement/RFP');
const { createActivityLog } = require('../../utils/logUtils');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const getRFQs = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const rfq = await RFQ.find({
    organization: orgid,
  }).populate('vendor', ['displayName']);
  res.status(200).json({
    success: true,
    message: 'RFQ fetched successfully',
    data: rfq,
  });
});

const getRFQLength = asyncHandler(async (req, res) => {
  const rfqCount = await RFQ.countDocuments();
  res.status(200).json({
    success: true,
    message: 'RFQ count retrieved successfully',
    data: rfqCount,
  });
});

const getRFQById = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findById(req.params.id)
    .populate('vendor')
    .populate('items.itemId')
    .populate('items.itemsId')
    .populate('items.fleetId')
    .populate('organization')
    .populate('user', [
      'signature',
      'userName',
      'role',
      'fullName',
      'phone',
      'email',
    ])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName']);

  if (!rfq) {
    throw new NotFoundError('RFQ not found');
  }

  res.status(200).json({
    success: true,
    message: 'RFQ fetched successfully',
    data: rfq,
  });
});

const createRFQ = asyncHandler(async (req, res) => {
  const orderId = req.params.orderId === '0' ? null : req.params.orderId;
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'rfq',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({ entity: 'rfq', organization });
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
    vendor,
    rfpId,
    termsNCondition,
    company,
    contactPerson,
    docAttached,
  } = req.body;
  const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  const hasApproval = await ifHasApproval('rfq', organization);

  const rfq = new RFQ({
    items,
    vendor,
    notes,
    termsNCondition,
    type,
    order: orderId,
    id: customID ? customID : salesOrderPrefix + paddedId,
    date,
    company,
    organization,
    user: req.id,
    contactPerson,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
  });
  const data = await rfq.save();

  if (rfpId) {
    await RFP.findByIdAndUpdate(rfpId, {
      $set: {
        rfqCreated: true,
      },
    });
  }

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'rfq',
    actionId: data.id,
    organization: data.organization,
    company: data.company,
  });

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'rfq',
      'pending',
      data.organization,
      data.company,
      data.id,
      'RFQ',
      'rfq',
      data._id
    );
  }

  // Generate embedding for the vendor
  // try {
  //   const vendorData = await Vendors.findById(data.vendor);
  //   if (vendorData) {
  //     await vendorData.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'RFQ created successfully',
    data,
  });
});

const getRFQsByAgent = asyncHandler(async (req, res) => {
  const rfq = await RFQ.find({
    user: req.id,
  }).populate('vendor');

  res.status(200).json({
    success: true,
    message: 'RFQ fetched successfully',
    data: rfq,
  });
});

const approveRFQ = asyncHandler(async (req, res) => {
  const updatedRFQ = await RFQ.findOneAndUpdate(
    { _id: req.params.id },
    { approval: 'accepted' },
    { new: true }
  );

  if (!updatedRFQ) {
    throw new NotFoundError('RFQ not found');
  }

  res.status(200).json({
    success: true,
    message: 'RFQ approved successfully',
    data: updatedRFQ,
  });
});

const updateRFQApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const rfq = await RFQ.findById(id);
  if (!rfq) {
    throw new NotFoundError('RFQ not found');
  }

  const resetFields = () => {
    rfq.verifiedBy = null;
    rfq.approvedBy1 = null;
    rfq.approvedBy2 = null;
    rfq.verifiedAt = null;
    rfq.approvedAt1 = null;
    rfq.approvedAt2 = null;
    rfq.reviewedBy = null;
    rfq.reviewedAt = null;
    rfq.acknowledgedBy = null;
    rfq.acknowledgedAt = null;
  };

  rfq.approval = approval;

  switch (approval) {
    case 'reviewed':
      rfq.reviewedBy = req.id || null;
      rfq.reviewedAt = new Date();
      rfq.verifiedBy = null;
      rfq.verifiedAt = null;
      rfq.acknowledgedBy = null;
      rfq.acknowledgedAt = null;
      break;
    case 'verified':
      rfq.verifiedBy = req.id || null;
      rfq.verifiedAt = new Date();
      rfq.acknowledgedBy = null;
      rfq.acknowledgedAt = null;
      break;
    case 'acknowledged':
      rfq.acknowledgedBy = req.id || null;
      rfq.acknowledgedAt = new Date();
      break;
    case 'approved1':
      rfq.approvedBy1 = req.id || null;
      rfq.approvedAt1 = new Date();
      break;
    case 'approved2':
      rfq.approvedBy2 = req.id || null;
      rfq.approvedAt2 = new Date();
      break;
    case 'correction':
      rfq.approvalComment = approvalComment || null;
      resetFields();
      break;
    default:
      break;
  }

  const updatedRFQ = await rfq.save();

  await findNextApprovalLevelAndNotify(
    'rfq',
    approval,
    updatedRFQ.organization,
    updatedRFQ.company,
    updatedRFQ.id,
    'RFQ',
    'rfq',
    updatedRFQ._id
  );

  await createActivityLog({
    userId: req.id,
    action: approval.includes('approve') ? 'approve' : approval,
    type: 'rfq',
    actionId: updatedRFQ.id,
    organization: updatedRFQ.organization,
    company: updatedRFQ.company,
  });

  res.status(200).json({
    success: true,
    message: 'RFQ approval updated successfully',
    data: updatedRFQ,
  });
});

const rejectRFQ = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;
  const updatedRFQ = await RFQ.findOneAndUpdate(
    { _id: req.params.id },
    { approval: 'rejected', approvalComment: approvalComment || null },
    { new: true }
  );

  if (!updatedRFQ) {
    throw new NotFoundError('RFQ not found');
  }

  res.status(200).json({
    success: true,
    message: 'RFQ rejected successfully',
    data: updatedRFQ,
  });
});

const changeValidation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { valid } = req.body;
  const rfq = await RFQ.findByIdAndUpdate(
    id,
    {
      $set: {
        valid,
      },
    },
    { new: true }
  );

  if (!rfq) {
    throw new NotFoundError('RFQ not found');
  }

  await createActivityLog({
    userId: req.id,
    action: 'invalidate',
    type: 'rfq',
    actionId: rfq.id,
    organization: rfq.organization,
    company: rfq.company,
  });

  res.status(200).json({
    success: true,
    message: 'RFQ validation updated successfully',
    data: rfq,
  });
});

const updateRFQ = asyncHandler(async (req, res) => {
  const updatedrfq = await RFQ.findOneAndUpdate(
    { _id: req.params.id },
    { ...req.body },
    { new: true }
  );

  if (!updatedrfq) {
    throw new NotFoundError('RFQ not found');
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'rfq',
    actionId: updatedrfq.id,
    organization: updatedrfq.organization,
    company: updatedrfq.company,
  });

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendors.findById(updatedrfq.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(200).json({
    success: true,
    message: 'RFQ updated successfully',
    data: updatedrfq,
  });
});

const reviseRFQ = asyncHandler(async (req, res) => {
  const rfq = await RFQ.findById(req.params.id);

  if (!rfq) {
    throw new NotFoundError('RFQ not found');
  }

  const baseId = rfq.id.split('-REV')[0];
  const currentRevision = rfq.id.includes('-REV')
    ? parseInt(rfq.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  const updatedrfq = await RFQ.findByIdAndUpdate(
    req.params.id,
    { ...req.body, id: newId },
    { new: true }
  );

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'rfq',
    actionId: updatedrfq.id,
    organization: updatedrfq.organization,
    company: updatedrfq.company,
  });

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendors.findById(updatedrfq.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(200).json({
    success: true,
    message: 'RFQ revised successfully',
    data: updatedrfq,
  });
});

const filterRFQs = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    filter_validity,
    filter_approval,
    search_query = '',
    filter_vendor,
    filter_vendorName,
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
  if (filter_vendor) {
    query.vendor = filter_vendor;
  }
  if (filter_vendorName) {
    const vendorIds = await Vendors.find({
      displayName: { $regex: filter_vendorName, $options: 'i' },
    }).distinct('_id');

    if (vendorIds.length > 0) {
      query.vendor = { $in: vendorIds };
    } else {
      query.vendor = null;
    }
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
    populate: [{ path: 'vendor', select: 'displayName currency' }],
  };

  const result = await RFQ.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'RFQ fetched successfully',
    data: {
      rfq: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalRfq: result.totalDocs,
    },
  });
});

const filterRFQsWithoutPagination = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    filter_validity,
    filter_approval,
    search_query = '',
    filter_vendor,
    filter_vendorName,
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
  if (filter_vendor) {
    query.vendor = filter_vendor;
  }
  if (filter_vendorName) {
    const vendorIds = await Vendors.find({
      displayName: { $regex: filter_vendorName, $options: 'i' },
    }).distinct('_id');

    if (vendorIds.length > 0) {
      query.vendor = { $in: vendorIds };
    } else {
      query.vendor = null;
    }
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

  const rfq = await RFQ.find(query)
    .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 })
    .select('date id vendor approval valid createdAt')
    .populate({ path: 'vendor', select: 'displayName currency' });

  res.status(200).json({
    success: true,
    message: 'RFQ fetched successfully',
    data: {
      rfq,
      totalRfq: rfq.length,
    },
  });
});

const filterRFQsByAgent = asyncHandler(async (req, res) => {
  const {
    filter_validity,
    filter_approval,
    search_query = '',
    filter_vendor,
    filter_vendorName,
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
  if (filter_vendor) {
    query.vendor = filter_vendor;
  }
  if (filter_vendorName) {
    const vendorIds = await Vendors.find({
      displayName: { $regex: filter_vendorName, $options: 'i' },
    }).distinct('_id');

    if (vendorIds.length > 0) {
      query.vendor = { $in: vendorIds };
    } else {
      query.vendor = null;
    }
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
    populate: [{ path: 'vendor', select: 'displayName currency' }],
  };

  const result = await RFQ.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'RFQ fetched successfully',
    data: {
      rfq: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalRfq: result.totalDocs,
    },
  });
});

const deleteRFQ = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rfq = await RFQ.findByIdAndDelete(id);

  if (!rfq) {
    throw new NotFoundError('RFQ not found');
  }

  res.status(200).json({
    success: true,
    message: 'RFQ deleted successfully',
    data: rfq,
  });
});

const checkExistId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { chanageId } = req.query;

  const rfq = await RFQ.findOne({
    organization: orgid,
    id: chanageId,
  });

  if (rfq) {
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
  getRFQs,
  getRFQLength,
  getRFQById,
  createRFQ,
  getRFQsByAgent,
  approveRFQ,
  updateRFQApproval,
  rejectRFQ,
  changeValidation,
  updateRFQ,
  reviseRFQ,
  filterRFQs,
  filterRFQsWithoutPagination,
  filterRFQsByAgent,
  deleteRFQ,
  checkExistId,
};
