const Account = require('../../../models/accounts/Account');
const BalanceSheet = require('../../../models/accounts/reports/BalanceSheet');
const Transaction = require('../../../models/accounts/Transaction');

const { asyncHandler } = require('../../../middleware/errorHandler');

const createBalanceSheet = asyncHandler(async (req, res) => {
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

  const balanceSheet = new BalanceSheet({
    organization,
    startDate: start,
    endDate: end,
    items: result,
  });
  await balanceSheet.save();

  res.status(200).json({
    success: true,
    message: 'Balance sheet created successfully',
    data: balanceSheet._id,
  });
});

const getBalanceSheetsByOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const balanceSheet = await BalanceSheet.find({ organization: orgid })
    .sort({ createdAt: -1 })
    .select('id startDate endDate');
  res.status(200).json({
    success: true,
    message: 'Balance sheets retrieved successfully',
    data: balanceSheet,
  });
});

const getBalanceSheetById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const balanceSheet = await BalanceSheet.findById(id).populate('organization');
  res.status(200).json({
    success: true,
    message: 'Balance sheet retrieved successfully',
    data: balanceSheet,
  });
});

module.exports = {
  createBalanceSheet,
  getBalanceSheetsByOrganization,
  getBalanceSheetById,
};
