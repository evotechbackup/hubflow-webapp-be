const Account = require('../../../models/accounts/Account');
const CashFlowStatement = require('../../../models/accounts/reports/CashFlowStatement');
const Transaction = require('../../../models/accounts/Transaction');

const { asyncHandler } = require('../../../middleware/errorHandler');

const createCashFlowStatement = asyncHandler(async (req, res) => {
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
    const query = {
      operating: [
        'income',
        'otherincome',
        'expense',
        'costofgoodssold',
        'otherexpense',
        'cashandbank',
        'othercurrentasset',
        'othercurrentliability',
      ],
      investing: ['fixedasset', 'stock', 'currentasset'],
      financing: ['ownersequity', 'longtermliability', 'currentliability'],
    };

    const accountTypes = [
      ...query.operating,
      ...query.investing,
      ...query.financing,
    ];

    const accounts = await Account.find({
      accountType: { $in: accountTypes },
      organization,
      accountName: { $ne: 'Drawings' },
    }).select('-embedding');

    // Fetch all transactions for the retrieved accounts in a single query
    const accountIds = accounts.map((account) => account._id);
    const firstTransaction = await Transaction.findOne(
      { account: { $in: accountIds } },
      { createdAt: 1 }
    )
      .sort({ createdAt: 1 })
      .lean();
    start = firstTransaction?.createdAt || new Date(0);
  }

  const cashFlowStatement = new CashFlowStatement({
    organization,
    startDate: start,
    endDate: end,
    operating: result.operating,
    investing: result.investing,
    financing: result.financing,
  });
  await cashFlowStatement.save();
  res.status(200).json({
    success: true,
    message: 'Cash flow statement created successfully',
    data: cashFlowStatement._id,
  });
});

const getCashFlowStatementsByOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const cashFlowStatement = await CashFlowStatement.find({
    organization: orgid,
  })
    .sort({ createdAt: -1 })
    .select('id startDate endDate');
  res.status(200).json({
    success: true,
    message: 'Cash flow statements retrieved successfully',
    data: cashFlowStatement,
  });
});

const getCashFlowStatementById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cashFlowStatement =
    await CashFlowStatement.findById(id).populate('organization');
  res.status(200).json({
    success: true,
    message: 'Cash flow statement retrieved successfully',
    data: cashFlowStatement,
  });
});

module.exports = {
  createCashFlowStatement,
  getCashFlowStatementsByOrganization,
  getCashFlowStatementById,
};
