const Category = require('../../models/inventory/Category');
const CRMCustomer = require('../../models/crm/CRMCustomer');
const CRMQuote = require('../../models/crm/CRMQuote');
const LastInsertedId = require('../../models/master/LastInsertedID');
const Product = require('../../models/inventory/Product');
const { asyncHandler } = require('../../middleware/errorHandler');

const createQuote = asyncHandler(async (req, res) => {
  const { dealId } = req.params;

  const {
    id,
    customID,
    organization,
    prefix,
    items,
    customer,
    employee,
    date,
    total,
    subtotal,
    tax,
    discount,
    notes,
    termsNCondition,
    company,
    docAttached = '',
    rfqNumber,
    subject,
    description,
    agent = null,
    contactPerson,
    itemsFromInventory,
    lead = null,
    contact = null,
    serviceCategory = null,
  } = req.body;

  const dealid = dealId === '0' ? null : dealId;

  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'Quotes',
    organization,
  });

  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({ entity: 'Quotes', organization });
  }

  if (id !== undefined && !isNaN(parseInt(id))) {
    lastInsertedId.lastId = parseInt(id);
  } else {
    lastInsertedId.lastId += 1;
  }

  if (prefix) {
    lastInsertedId.prefix = prefix;
  }
  await lastInsertedId.save();

  const quotePrefix = prefix || lastInsertedId.prefix || '';
  const paddedId = String(lastInsertedId.lastId).padStart(2, '0');

  const newQuote = new CRMQuote({
    items,
    customer,
    employee,
    date,
    total,
    subtotal,
    tax,
    discount,
    notes,
    termsNCondition,
    id: customID ? customID : quotePrefix + paddedId,
    company,
    organization,
    agent,
    rfqNumber,
    subject,
    description,
    docAttached,
    contactPerson,
    lead,
    contact,
    serviceCategory,
    deal: dealid || null,
  });

  const savedQuote = await newQuote.save();

  let uncategorizedProduct;
  for (let i = 0; i < items?.length; i++) {
    if (!uncategorizedProduct) {
      const cp = await Category.findOne({
        company,
        organization,
        categoryName: 'Uncategorized',
        type: 'goods',
      });
      uncategorizedProduct = cp?._id;
    }
    if (!itemsFromInventory) {
      const newProduct = new Product({
        company,
        organization,
        productName: items[i]?.productName,
        price: items[i]?.price,
        unit: items[i]?.unit,
        category: uncategorizedProduct,
      });
      await newProduct.save();
    }
  }

  res.status(201).json({
    success: true,
    message: 'Quote created successfully',
    data: savedQuote,
  });
});

const getFilterQuotes = asyncHandler(async (req, res) => {
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
    page = 1,
    limit = 25,
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
    query.acceptStatus = filter_acceptStatus;
  }
  if (search_query) {
    query.$or = [
      { rfqNumber: { $regex: search_query, $options: 'i' } },
      { id: { $regex: search_query, $options: 'i' } },
    ];
  }
  if (customer_name !== '') {
    const customerIds = await CRMCustomer.find({
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
    sort: { createdAt: -1 },
    populate: [{ path: 'customer', select: 'displayName currency' }],
  };

  const result = await CRMQuote.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Quotes fetched successfully',
    data: {
      quotes: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalQuotes: result.totalDocs,
    },
  });
});

const getAgentFilterQuotes = asyncHandler(async (req, res) => {
  const agentId = req.params.agentid;
  const {
    filter_validity,
    filter_approval,
    filter_acceptStatus,
    filter_customer,
    customer_name = '',
    search_query = '',
    startDate,
    endDate,
    page = 1,
    limit = 25,
  } = req.query;

  const dateFilter = {};
  if (startDate !== 'undefined' && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate !== 'undefined' && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    agent: agentId,
  };

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
    query.acceptStatus = filter_acceptStatus;
  }
  if (search_query) {
    query.$or = [
      { rfqNumber: { $regex: search_query, $options: 'i' } },
      { id: { $regex: search_query, $options: 'i' } },
    ];
  }
  if (customer_name !== '') {
    const customerIds = await CRMCustomer.find({
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
    sort: { createdAt: -1 },
    populate: [{ path: 'customer', select: 'displayName currency' }],
  };

  const result = await CRMQuote.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Quotes fetched successfully',
    data: {
      quotes: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalQuotes: result.totalDocs,
    },
  });
});

const changeValidation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { valid } = req.body;
  const quote = await CRMQuote.findByIdAndUpdate(
    id,
    {
      $set: {
        valid,
      },
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Quote validation changed successfully',
    data: quote,
  });
});

const getQuoteById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quotes = await CRMQuote.find({ id })
    .populate('customer')
    .populate('employee')
    .populate('items.itemId')
    .populate('items.itemsId')
    .populate('company');
  res.status(200).json({
    success: true,
    message: 'Quote fetched successfully',
    data: quotes,
  });
});
const getQuotebyfortemById = asyncHandler(async (req, res) => {
  const _id = req.params.id;
  const quotes = await CRMQuote.find({ _id })
    .populate('lead')
    .populate('contact')
    .populate('items.itemId')
    .populate('items.itemsId')
    .populate('serviceCategory', ['name'])
    .populate('company')
    .populate('agent', [
      'signature',
      'fullName',
      'email',
      'phone',
      'profileType',
    ])
    .populate('organization');
  res.status(200).json({
    success: true,
    message: 'Quote fetched successfully',
    data: quotes,
  });
});

const getQuoteByQuoteId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quotes = await CRMQuote.findById(id)
    .populate('lead', 'displayName')
    .populate('contact', 'displayName')
    .populate('customer')
    .populate('employee')
    .populate('items.itemId')
    .populate('items.itemsId');
  res.status(200).json({
    success: true,
    message: 'Quote fetched successfully',
    data: quotes,
  });
});

const updateQuote = asyncHandler(async (req, res) => {
  const updatedQuote = await CRMQuote.findOneAndUpdate(
    { _id: req.params.id },
    { ...req.body },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Quote updated successfully',
    data: updatedQuote,
  });
});

const updateQuoteStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quote = await CRMQuote.findOneAndUpdate(
    { _id: id },
    { acceptStatus: req.body.acceptStatus },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Quote status updated successfully',
    data: quote,
  });
});

module.exports = {
  createQuote,
  getFilterQuotes,
  getAgentFilterQuotes,
  getQuoteById,
  getQuoteByQuoteId,
  updateQuote,
  changeValidation,
  updateQuoteStatus,
  getQuotebyfortemById,
};
