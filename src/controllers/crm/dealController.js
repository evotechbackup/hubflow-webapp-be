const CRMQuote = require('../../models/crm/CRMQuote');
const Deal = require('../../models/crm/Deals');
const { asyncHandler } = require('../../middleware/errorHandler');

const createDeal = asyncHandler(async (req, res) => {
  const { name, lead, contact, employee, organization, company } = req.body;
  const deal = await Deal.create({
    name,
    lead,
    contact,
    employee,
    organization,
    company,
  });
  res.status(201).json({
    success: true,
    message: 'deal created successfully',
    data: deal,
  });
});

const changeOrderStatus = asyncHandler(async (req, res) => {
  const { dealId, present } = req.body;
  const deal = await Deal.findByIdAndUpdate(
    dealId,
    { status: present },
    { new: true }
  );
  if (!deal) {
    throw new Error('Deal not found');
  }
  res.status(201).json({
    success: true,
    message: 'deal status updated successfully',
    data: deal,
  });
});

const updateDeal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, employee } = req.body;
  const deal = await Deal.findByIdAndUpdate(
    id,
    {
      name,
      employee,
    },
    { new: true }
  );
  res.status(201).json({
    success: true,
    message: 'deal updated successfully',
    data: deal,
  });
});

const getDeals = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const deals = await Deal.find({ organization: orgid })
    .populate('lead', ['displayName'])
    .populate('contact', ['displayName'])
    .populate('employee', ['firstName', 'lastName']);
  res.status(200).json({
    success: true,
    message: 'deals fetched successfully',
    data: deals,
  });
});

const getDealById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deal = await Deal.findById(id)
    .populate('lead', ['displayName', 'email', 'phone'])
    .populate('contact', ['displayName', 'email', 'phone'])
    .populate('employee', ['firstName', 'lastName', 'email', 'workPhoneNo']);
  res.status(200).json({
    success: true,
    message: 'deal fetched successfully',
    data: deal,
  });
});

const getDealHistoryById = asyncHandler(async (req, res) => {
  const quotes = await CRMQuote.find({
    deal: req.params.dealId,
  });

  const quotesWithType = quotes.map((quote) => ({
    ...quote.toObject(),
    type: 'quotes',
  }));

  res.status(201).json({
    success: true,
    message: 'deal history fetched successfully',
    data: quotesWithType,
  });
});

module.exports = {
  createDeal,
  changeOrderStatus,
  updateDeal,
  getDeals,
  getDealById,
  getDealHistoryById,
};
