const Quotes = require('../../models/sales/Quotes');
const LastInsertedId = require('../../models/master/LastInsertedID');
// const {
//   findNextApprovalLevelAndNotify,
//   ifHasApproval,
// } = require('../../utilities/approvalUtils');
// const { createActivityLog } = require('../../utilities/logUtils');
const Customer = require('../../models/sales/Customer');

const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const postQuotes = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;

  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'Quotes',
    organization,
  });

  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({ entity: 'Quotes', organization });
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
  const newQuotes = new Quotes({
    shipmentType,
    enquiry,
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
  const savedQuote = await newQuotes.save();

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
    message: 'Quote created successfully',
    data: savedQuote,
  });
});

const getQuotesById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quote = await Quotes.findById(id).populate('customer');
  res.status(200).json({
    success: true,
    message: 'Quote fetched successfully',
    data: quote,
  });
});

const getQuotesDetailsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quote = await Quotes.findById(id)
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
    message: 'Quote fetched successfully',
    data: quote,
  });
});

const rejectQuote = asyncHandler(async (req, res) => {
  try {
    const { approvalComment } = req.body;
    const updatedQuote = await Quotes.findById(
      req.params.id,
      { approval: 'rejected', approvalComment },
      { new: true }
    );
    res.status(201).json(updatedQuote);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const updateQuoteApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const quote = await Quotes.findById(id);
  if (!quote) {
    throw new NotFoundError('Quote not found');
  }

  // Reset fields based on approval type
  const resetFields = () => {
    quote.verifiedBy = null;
    quote.approvedBy1 = null;
    quote.approvedBy2 = null;
    quote.verifiedAt = null;
    quote.approvedAt1 = null;
    quote.approvedAt2 = null;
    quote.reviewedBy = null;
    quote.reviewedAt = null;
    quote.acknowledgedBy = null;
    quote.acknowledgedAt = null;
  };

  // Set approval status
  quote.approval = approval;

  if (approval === 'correction') {
    quote.approvalComment = approvalComment || null;
  }

  // Handle different approval types
  switch (approval) {
    case 'reviewed':
      quote.reviewedBy = req.id || null;
      quote.reviewedAt = new Date();
      quote.verifiedBy = null;
      quote.verifiedAt = null;
      quote.acknowledgedBy = null;
      quote.acknowledgedAt = null;
      break;
    case 'verified':
      quote.verifiedBy = req.id || null;
      quote.verifiedAt = new Date();
      quote.acknowledgedBy = null;
      quote.acknowledgedAt = null;
      break;
    case 'acknowledged':
      quote.acknowledgedBy = req.id || null;
      quote.acknowledgedAt = new Date();
      break;
    case 'approved1':
      quote.approvedBy1 = req.id || null;
      quote.approvedAt1 = new Date();
      break;
    case 'approved2':
      quote.approvedBy2 = req.id || null;
      quote.approvedAt2 = new Date();
      break;
    case 'correction':
    case 'rejected':
      resetFields();
      break;
    default:
      break;
  }

  const updatedQuote = await quote.save();

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
    message: 'Quote updated successfully',
    data: updatedQuote,
  });
});

const changeValidation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { valid } = req.body;
  const quote = await Quotes.findById(id);
  if (!quote) {
    throw new NotFoundError('Quote not found');
  }

  // const hasApproval = await ifHasApproval('quotes', quote.organization);

  quote.valid = valid;
  // quote.approval = hasApproval ? (valid ? 'pending' : 'rejected') : 'none';
  quote.verifiedAt = null;
  quote.verifiedBy = null;
  quote.reviewedAt = null;
  quote.reviewedBy = null;
  quote.approvedAt1 = null;
  quote.approvedBy1 = null;
  quote.approvedAt2 = null;
  quote.approvedBy2 = null;
  quote.acknowledgedAt = null;
  quote.acknowledgedBy = null;
  await quote.save();

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
    message: 'Quote updated successfully',
    data: quote,
  });
});

const updateQuote = asyncHandler(async (req, res) => {
  const { isrevised } = req.query;

  const quote = await Quotes.findById(req.params.id);

  if (!quote) {
    throw new NotFoundError('Quote not found');
  }

  const baseId = quote.id.split('-REV')[0];
  const currentRevision = quote.id.includes('-REV')
    ? parseInt(quote.id.split('-REV')[1])
    : 0;

  // Increment the revision number
  const newRevision = currentRevision + 1;

  // Create the new ID
  const newId = `${baseId}-REV${newRevision}`;

  const updatedQuote = await Quotes.findOneAndUpdate(
    { _id: req.params.id },
    {
      ...req.body,
      id: isrevised === 'true' ? newId : quote.id,
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
    message: 'Quote updated successfully',
    data: updatedQuote,
  });
});

const getQuotes = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const {
    filter_validity,
    filter_approval,
    filter_acceptStatus,
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
  if (filter_acceptStatus) {
    if (filter_acceptStatus === 'pending') {
      query.acceptStatus = { $in: ['pending', 'notsubmitted', 'submitted'] };
    } else {
      query.acceptStatus = filter_acceptStatus;
    }
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
    ],
  };

  const result = await Quotes.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Quote fetched successfully',
    data: {
      quotes: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalQuotes: result.totalDocs,
    },
  });
});

const deleteQuote = asyncHandler(async (req, res) => {
  const quote = await Quotes.findByIdAndDelete(req.params.id);
  res.status(201).json({
    success: true,
    message: 'Quote deleted successfully',
    data: quote,
  });
});

module.exports = {
  postQuotes,
  getQuotes,
  getQuotesById,
  getQuotesDetailsById,
  updateQuote,
  rejectQuote,
  updateQuoteApproval,
  changeValidation,
  deleteQuote,
};
