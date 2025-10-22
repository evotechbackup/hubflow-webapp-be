const Enquiry = require('../../models/sales/Enquiry');
const LastInsertedId = require('../../models/master/LastInsertedID');
// const {
//   findNextApprovalLevelAndNotify,
//   ifHasApproval,
// } = require('../../utilities/approvalUtils');
// const { createActivityLog } = require('../../utilities/logUtils');
const Customer = require('../../models/sales/Customer');

const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const postEnquiry = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;

  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'Enquiry',
    organization,
  });

  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({ entity: 'Enquiry', organization });
  }

  if (id !== undefined && !isNaN(parseInt(id))) {
    lastInsertedId.lastId = parseInt(id);
    await lastInsertedId.save();
  } else {
    lastInsertedId.lastId += 1;
    await lastInsertedId.save();
  }
  const { prefix } = req.body;
  const quotePrefix = prefix || lastInsertedId.prefix || '';

  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }
  const {
    shipmentType,
    incoterm,
    etd,
    eta,
    payableAt,
    dispatchAt,
    origin,
    destination,
    customer,
    contactPerson,
    items,
    date,
    reference,
    subject,
    description,
    notes,
    termsNCondition,
    company,
    docAttached = '',
    user = null,
  } = req.body;
  const paddedId = String(lastInsertedId.lastId).padStart(2, '0');

  // const hasApproval = await ifHasApproval('enquiry', organization);

  // Create a new instance of the Enquiry model
  const newEnquiry = new Enquiry({
    shipmentType,
    incoterm,
    etd,
    eta,
    payableAt,
    dispatchAt,
    origin,
    destination,
    items,
    customer,
    date,
    reference,
    subject,
    description,
    notes,
    termsNCondition,
    id: customID ? customID : quotePrefix + paddedId,
    company,
    organization,
    user,
    docAttached,
    contactPerson,
    //   approval: hasApproval ? 'pending' : 'none',
  });

  // Save the new enquiry to the database
  const savedEnquiry = await newEnquiry.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'enquiry',
  //   actionId: savedEnquiry.id,
  //   organization: savedEnquiry.organization,
  //   company: savedEnquiry.company,
  // });

  // if (hasApproval) {
  //   await findNextApprovalLevelAndNotify(
  //     'enquiry',
  //     'pending',
  //     savedEnquiry.organization,
  //     savedEnquiry.company,
  //     savedEnquiry.id,
  //     'Enquiry',
  //     'enquiries',
  //     savedEnquiry._id
  //   );
  // }

  // Send the saved enquiry as a response
  res.status(201).json({
    success: true,
    message: 'Enquiry created successfully',
    data: savedEnquiry,
  });
});

const getEnquiryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const enquiry = await Enquiry.findById(id).populate('customer');
  res.status(200).json({
    success: true,
    message: 'Enquiry fetched successfully',
    data: enquiry,
  });
});

const getEnquiryDetailsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const enquiry = await Enquiry.findById(id)
    .populate('customer')
    .populate('organization')
    .populate('user', [
      'signature',
      'userName',
      'profileType',
      'fullName',
      'phone',
      'email',
    ])
    .populate('reviewedBy', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('verifiedBy', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('approvedBy1', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('approvedBy2', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ]);
  res.status(200).json({
    success: true,
    message: 'Enquiry fetched successfully',
    data: enquiry,
  });
});

const updateEnquiryStatus = asyncHandler(async (req, res) => {
  try {
    const { approvalComment } = req.body;
    const updatedEnquiry = await Enquiry.findById(
      req.params.id,
      { approval: 'rejected', approvalComment },
      { new: true }
    );
    res.status(201).json(updatedEnquiry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const updateEnquiryApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    throw new NotFoundError('Enquiry not found');
  }

  // Reset fields based on approval type
  const resetFields = () => {
    enquiry.verifiedBy = null;
    enquiry.approvedBy1 = null;
    enquiry.approvedBy2 = null;
    enquiry.verifiedAt = null;
    enquiry.approvedAt1 = null;
    enquiry.approvedAt2 = null;
    enquiry.reviewedBy = null;
    enquiry.reviewedAt = null;
    enquiry.acknowledgedBy = null;
    enquiry.acknowledgedAt = null;
  };

  // Set approval status
  enquiry.approval = approval;

  if (approval === 'correction') {
    enquiry.approvalComment = approvalComment || null;
  }

  // Handle different approval types
  switch (approval) {
    case 'reviewed':
      enquiry.reviewedBy = req.id || null;
      enquiry.reviewedAt = new Date();
      enquiry.verifiedBy = null;
      enquiry.verifiedAt = null;
      enquiry.acknowledgedBy = null;
      enquiry.acknowledgedAt = null;
      break;
    case 'verified':
      enquiry.verifiedBy = req.id || null;
      enquiry.verifiedAt = new Date();
      enquiry.acknowledgedBy = null;
      enquiry.acknowledgedAt = null;
      break;
    case 'acknowledged':
      enquiry.acknowledgedBy = req.id || null;
      enquiry.acknowledgedAt = new Date();
      break;
    case 'approved1':
      enquiry.approvedBy1 = req.id || null;
      enquiry.approvedAt1 = new Date();
      break;
    case 'approved2':
      enquiry.approvedBy2 = req.id || null;
      enquiry.approvedAt2 = new Date();
      break;
    case 'correction':
    case 'rejected':
      resetFields();
      break;
    default:
      break;
  }

  const updatedEnquiry = await enquiry.save();

  // Find next approval level and send notifications
  // await findNextApprovalLevelAndNotify(
  //   'enquiry',
  //   approval,
  //   updatedEnquiry.organization,
  //   updatedEnquiry.company,
  //   updatedEnquiry.id,
  //   'Enquiry',
  //   'enquiries',
  //   updatedEnquiry._id
  // );

  // await createActivityLog({
  //   userId: req._id,
  //   action: approval?.includes('approve') ? 'approve' : approval,
  //   type: 'enquiry',
  //   actionId: updatedEnquiry.id,
  //   organization: updatedEnquiry.organization,
  //   company: updatedEnquiry.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Enquiry updated successfully',
    data: updatedEnquiry,
  });
});

const changeValidation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { valid } = req.body;
  const enquiry = await Enquiry.findById(id);
  if (!enquiry) {
    throw new NotFoundError('Enquiry not found');
  }

  // const hasApproval = await ifHasApproval('enquiry', enquiry.organization);

  enquiry.valid = valid;
  // enquiry.approval = hasApproval ? (valid ? 'pending' : 'rejected') : 'none';
  enquiry.verifiedAt = null;
  enquiry.verifiedBy = null;
  enquiry.reviewedAt = null;
  enquiry.reviewedBy = null;
  enquiry.approvedAt1 = null;
  enquiry.approvedBy1 = null;
  enquiry.approvedAt2 = null;
  enquiry.approvedBy2 = null;
  enquiry.acknowledgedAt = null;
  enquiry.acknowledgedBy = null;
  await enquiry.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'invalidate',
  //   type: 'enquiry',
  //   actionId: enquiry.id,
  //   organization: enquiry.organization,
  //   company: enquiry.company,
  // });
  res.status(201).json({
    success: true,
    message: 'Enquiry updated successfully',
    data: enquiry,
  });
});

const updateEnquiry = asyncHandler(async (req, res) => {
  const { isrevised } = req.query;

  const enquiry = await Enquiry.findById(req.params.id);

  if (!enquiry) {
    throw new NotFoundError('Enquiry not found');
  }

  const baseId = enquiry.id.split('-REV')[0];
  const currentRevision = enquiry.id.includes('-REV')
    ? parseInt(enquiry.id.split('-REV')[1])
    : 0;

  // Increment the revision number
  const newRevision = currentRevision + 1;

  // Create the new ID
  const newId = `${baseId}-REV${newRevision}`;

  const updatedEnquiry = await Enquiry.findOneAndUpdate(
    { _id: req.params.id },
    {
      ...req.body,
      id: isrevised === 'true' ? newId : enquiry.id,
      verifiedAt: null,
      verifiedBy: null,
      reviewedAt: null,
      reviewedBy: null,
      approvedAt1: null,
      approvedBy1: null,
      approvedAt2: null,
      approvedBy2: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
    },
    { new: true }
  );

  // const hasApproval = await ifHasApproval(
  //   'enquiry',
  //   updatedEnquiry.organization
  // );

  // updatedEnquiry.approval = hasApproval ? 'pending' : 'none';
  // await updatedEnquiry.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'enquiry',
  //   actionId: updatedEnquiry.id,
  //   organization: updatedEnquiry.organization,
  //   company: updatedEnquiry.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Enquiry updated successfully',
    data: updatedEnquiry,
  });
});

const getEnquiry = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const {
    filter_validity,
    filter_approval,
    filter_customer,
    search_query = '',
    customer_name = '',
    startDate,
    endDate,
    sort_by = 'date',
    sort_order = 'desc',
    page = 1,
    limit = 25,
    is_agent,
  } = req.query;

  const dateFilter = {};
  if (startDate !== 'undefined' && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate !== 'undefined' && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    organization: orgId,
  };

  if (is_agent && is_agent !== 'undefined' && is_agent !== 'null') {
    query.agent = is_agent;
  }

  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_customer) {
    query.customer = filter_customer;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }
  if (customer_name !== '') {
    const customerIds = await Customer.find({
      displayName: { $regex: customer_name, $options: 'i' },
    }).distinct('_id');
    if (customerIds.length > 0) {
      query.customer = { $in: customerIds };
    } else {
      query.customer = null;
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
    populate: [{ path: 'customer', select: 'displayName currency' }],
  };

  const result = await Enquiry.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Enquiry fetched successfully',
    data: {
      enquiries: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalEnquiries: result.totalDocs,
    },
  });
});

const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
  res.status(201).json({
    success: true,
    message: 'Enquiry deleted successfully',
    data: enquiry,
  });
});

module.exports = {
  postEnquiry,
  getEnquiry,
  getEnquiryById,
  getEnquiryDetailsById,
  updateEnquiry,
  updateEnquiryStatus,
  updateEnquiryApproval,
  changeValidation,
  deleteEnquiry,
};
