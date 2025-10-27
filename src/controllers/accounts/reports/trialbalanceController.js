const TrialBalance = require('../../../models/accounts/reports/TrialBalance');
const Transaction = require('../../../models/accounts/Transaction');
const Account = require('../../../models/accounts/Account');

const { asyncHandler } = require('../../../middleware/errorHandler');

const createTrialBalance = asyncHandler(async (req, res) => {
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
    // Fetch all accounts for the organization
    const accounts = await Account.find({ organization })
      .sort({
        accountName: 1,
      })
      .select('accountName accountCode amount')
      .lean();

    // Get the latest transaction for each account in a single query
    const accountIds = accounts.map((acc) => acc._id);

    const firstTransaction = await Transaction.findOne(
      { account: { $in: accountIds } },
      { createdAt: 1 }
    )
      .sort({ createdAt: 1 })
      .lean();
    start = firstTransaction?.createdAt || new Date(0);
  }

  const trialBalance = new TrialBalance({
    organization,
    startDate: start,
    endDate: end,
    items: result,
  });
  await trialBalance.save();
  res.status(200).json({
    success: true,
    message: 'Trial balance created successfully',
    data: trialBalance._id,
  });
});

const getTrialBalancesByOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const trialBalance = await TrialBalance.find({ organization: orgid })
    .sort({ createdAt: -1 })
    .select('id startDate endDate');
  res.status(200).json({
    success: true,
    message: 'Trial balances retrieved successfully',
    data: trialBalance,
  });
});

const getTrialBalanceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const trialBalance = await TrialBalance.findById(id).populate('organization');
  res.status(200).json({
    success: true,
    message: 'Trial balance retrieved successfully',
    data: trialBalance,
  });
});

module.exports = {
  createTrialBalance,
  getTrialBalancesByOrganization,
  getTrialBalanceById,
};
