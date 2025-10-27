const Account = require('../../../models/accounts/Account');
const ProfitNLoss = require('../../../models/accounts/reports/ProfitNLoss');
const Transaction = require('../../../models/accounts/Transaction');

const { asyncHandler } = require('../../../middleware/errorHandler');

const createProfitNLoss = asyncHandler(async (req, res) => {
  const { startDate, endDate, result, organization } = req.body;

  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  if (!startDate || startDate === 'null') {
    const accountIds = await Account.find({
      organization,
    }).distinct('_id');
    const firstTransaction = await Transaction.findOne(
      { account: { $in: accountIds } },
      { createdAt: 1 }
    )
      .sort({ createdAt: 1 })
      .lean();
    start = firstTransaction?.createdAt || new Date(0);
  }

  const profitNLoss = new ProfitNLoss({
    organization,
    startDate: start,
    endDate: end,
    items: result,
  });
  await profitNLoss.save();
  res.status(200).json({
    success: true,
    message: 'Profit and loss created successfully',
    data: profitNLoss._id,
  });
});

const getProfitNLossesByOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const profitNLoss = await ProfitNLoss.find({ organization: orgid })
    .sort({ createdAt: -1 })
    .select('id startDate endDate');
  res.status(200).json({
    success: true,
    message: 'Profit and loss retrieved successfully',
    data: profitNLoss,
  });
});

const getProfitNLossById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const profitNLoss = await ProfitNLoss.findById(id).populate('organization');
  res.status(200).json({
    success: true,
    message: 'Profit and loss retrieved successfully',
    data: profitNLoss,
  });
});

module.exports = {
  createProfitNLoss,
  getProfitNLossesByOrganization,
  getProfitNLossById,
};
