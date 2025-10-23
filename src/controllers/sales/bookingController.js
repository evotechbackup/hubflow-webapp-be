const Booking = require('../../models/sales/Booking');
const LastInsertedId = require('../../models/master/LastInsertedID');
// const {
//   findNextApprovalLevelAndNotify,
//   ifHasApproval,
// } = require('../../utilities/approvalUtils');
// const { createActivityLog } = require('../../utilities/logUtils');
const Customer = require('../../models/sales/Customer');

const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const postBooking = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;

  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'Booking',
    organization,
  });

  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({ entity: 'Booking', organization });
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
    enquiry,
    quote,
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
    total,
    subtotal,
    vat,
    discount,
  } = req.body;
  const paddedId = String(lastInsertedId.lastId).padStart(2, '0');

  // const hasApproval = await ifHasApproval('quotes', organization);

  // Create a new instance of the quotes model
  const newBooking = new Booking({
    shipmentType,
    enquiry,
    quote,
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
    docAttached,
    contactPerson,
    total,
    subtotal,
    vat,
    discount,
    user: req.id,
    //   approval: hasApproval ? 'pending' : 'none',
  });

  // Save the new quote to the database
  const savedBooking = await newBooking.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'quote',
  //   actionId: savedQuote.id,
  //   organization: savedQuote.organization,
  //   company: savedQuote.company,
  // });

  // if (hasApproval) {
  //   await findNextApprovalLevelAndNotify(
  //     'quotes',
  //     'pending',
  //     savedQuote.organization,
  //     savedQuote.company,
  //     savedQuote.id,
  //     'Quotes',
  //     'quotes',
  //     savedQuote._id
  //   );
  // }

  // Send the saved quote as a response
  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: savedBooking,
  });
});

const getBookingById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findById(id).populate('customer');
  res.status(200).json({
    success: true,
    message: 'Booking fetched successfully',
    data: booking,
  });
});

const getBookingDetailsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const booking = await Booking.findById(id)
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
    message: 'Booking fetched successfully',
    data: booking,
  });
});

const rejectBooking = asyncHandler(async (req, res) => {
  try {
    const { approvalComment } = req.body;
    const updatedBooking = await Booking.findById(
      req.params.id,
      { approval: 'rejected', approvalComment },
      { new: true }
    );
    res.status(201).json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const updateBookingApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // Reset fields based on approval type
  const resetFields = () => {
    booking.verifiedBy = null;
    booking.approvedBy1 = null;
    booking.approvedBy2 = null;
    booking.verifiedAt = null;
    booking.approvedAt1 = null;
    booking.approvedAt2 = null;
    booking.reviewedBy = null;
    booking.reviewedAt = null;
    booking.acknowledgedBy = null;
    booking.acknowledgedAt = null;
  };

  // Set approval status
  booking.approval = approval;

  if (approval === 'correction') {
    booking.approvalComment = approvalComment || null;
  }

  // Handle different approval types
  switch (approval) {
    case 'reviewed':
      booking.reviewedBy = req.id || null;
      booking.reviewedAt = new Date();
      booking.verifiedBy = null;
      booking.verifiedAt = null;
      booking.acknowledgedBy = null;
      booking.acknowledgedAt = null;
      break;
    case 'verified':
      booking.verifiedBy = req.id || null;
      booking.verifiedAt = new Date();
      booking.acknowledgedBy = null;
      booking.acknowledgedAt = null;
      break;
    case 'acknowledged':
      booking.acknowledgedBy = req.id || null;
      booking.acknowledgedAt = new Date();
      break;
    case 'approved1':
      booking.approvedBy1 = req.id || null;
      booking.approvedAt1 = new Date();
      break;
    case 'approved2':
      booking.approvedBy2 = req.id || null;
      booking.approvedAt2 = new Date();
      break;
    case 'correction':
    case 'rejected':
      resetFields();
      break;
    default:
      break;
  }

  const updatedBooking = await booking.save();

  // Find next approval level and send notifications
  // await findNextApprovalLevelAndNotify(
  //   'quotes',
  //   approval,
  //   updatedQuote.organization,
  //   updatedQuote.company,
  //   updatedQuote.id,
  //   'Quotes',
  //   'quotes',
  //   updatedQuote._id
  // );

  // await createActivityLog({
  //   userId: req._id,
  //   action: approval?.includes('approve') ? 'approve' : approval,
  //   type: 'quote',
  //   actionId: updatedQuote.id,
  //   organization: updatedQuote.organization,
  //   company: updatedQuote.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Booking updated successfully',
    data: updatedBooking,
  });
});

const changeValidation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { valid } = req.body;
  const booking = await Booking.findById(id);
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // const hasApproval = await ifHasApproval('quotes', quote.organization);

  booking.valid = valid;
  // quote.approval = hasApproval ? (valid ? 'pending' : 'rejected') : 'none';
  booking.verifiedAt = null;
  booking.verifiedBy = null;
  booking.reviewedAt = null;
  booking.reviewedBy = null;
  booking.approvedAt1 = null;
  booking.approvedBy1 = null;
  booking.approvedAt2 = null;
  booking.approvedBy2 = null;
  booking.acknowledgedAt = null;
  booking.acknowledgedBy = null;
  await booking.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'invalidate',
  //   type: 'quote',
  //   actionId: quote.id,
  //   organization: quote.organization,
  //   company: quote.company,
  // });
  res.status(201).json({
    success: true,
    message: 'Booking updated successfully',
    data: booking,
  });
});

const updateBooking = asyncHandler(async (req, res) => {
  const { isrevised } = req.query;

  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  const baseId = booking.id.split('-REV')[0];
  const currentRevision = booking.id.includes('-REV')
    ? parseInt(booking.id.split('-REV')[1])
    : 0;

  // Increment the revision number
  const newRevision = currentRevision + 1;

  // Create the new ID
  const newId = `${baseId}-REV${newRevision}`;

  const updatedBooking = await Booking.findOneAndUpdate(
    { _id: req.params.id },
    {
      ...req.body,
      id: isrevised === 'true' ? newId : booking.id,
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
  //   'quotes',
  //   updatedQuote.organization
  // );

  // updatedQuote.approval = hasApproval ? 'pending' : 'none';
  // await updatedQuote.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'quote',
  //   actionId: updatedQuote.id,
  //   organization: updatedQuote.organization,
  //   company: updatedQuote.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Booking updated successfully',
    data: updatedBooking,
  });
});

const getBookings = asyncHandler(async (req, res) => {
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
    populate: [
      { path: 'customer', select: 'displayName currency' },
      { path: 'enquiry', select: 'id' },
      { path: 'quote', select: 'id' },
    ],
  };

  const result = await Booking.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Booking fetched successfully',
    data: {
      bookings: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalQuotes: result.totalDocs,
    },
  });
});

const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByIdAndDelete(req.params.id);
  res.status(201).json({
    success: true,
    message: 'Booking deleted successfully',
    data: booking,
  });
});

module.exports = {
  postBooking,
  getBookings,
  getBookingById,
  getBookingDetailsById,
  updateBooking,
  rejectBooking,
  updateBookingApproval,
  changeValidation,
  deleteBooking,
};
