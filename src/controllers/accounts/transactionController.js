const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const getTransactions = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.accountid);

  if (!account) {
    throw new NotFoundError('Account not found');
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let transactions = [];
  const baseQuery = {
    account: req.params.accountid,
  };

  const populateOptions = [
    { path: 'product', select: 'productName' },
    { path: 'invoice', select: 'id' },
    { path: 'purchaseOrder', select: 'id' },
    { path: 'customer', select: 'displayName' },
    { path: 'vendor', select: 'displayName' },
    { path: 'discount', select: 'accountName' },
  ];

  if (
    account.accountName === 'VAT Payable' ||
    account.accountName === 'VAT Receivable'
  ) {
    const [inputVat, outputVat] = await Promise.all([
      Account.findOne({
        accountName: 'Input VAT',
        organization: account.organization,
      }),
      Account.findOne({
        accountName: 'Output VAT',
        organization: account.organization,
      }),
    ]);

    const [inputVatTransactions, outputVatTransactions] = await Promise.all([
      Transaction.find({ account: inputVat._id })
        .populate(populateOptions)
        .skip(skip)
        .limit(limit),
      Transaction.find({ account: outputVat._id })
        .populate(populateOptions)
        .skip(skip)
        .limit(limit),
    ]);

    transactions = [...inputVatTransactions, ...outputVatTransactions];
    transactions = transactions.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  } else if (account.accountName === 'Purchase Discount') {
    transactions = await Transaction.find({ discount: req.params.accountid })
      .populate(populateOptions)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  } else {
    transactions = await Transaction.find(baseQuery)
      .populate(populateOptions)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: transactions,
  });
});

// transaction by product Id
const getTransactionsByProductId = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({
    product: req.params.productid,
  })
    .populate('account', ['accountName'])
    .populate('invoice', ['id'])
    .populate('purchaseOrder', ['id'])
    .populate('customer', ['displayName'])
    .populate('vendor', ['displayName'])
    .populate('discount', ['accountName'])
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: transactions,
  });
});

// transaction by product Id
const getTransactionsByServiceId = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({
    service: req.params.id,
  })
    .populate('account', ['accountName'])
    .populate('customer', ['displayName'])
    .populate('vendor', ['displayName'])
    .populate('discount', ['accountName'])
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: transactions,
  });
});

// transaction by fleet id
const getTransactionsByFleetId = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find({
    fleet: req.params.fleetid,
  })
    .populate('account', ['accountName'])
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: transactions,
  });
});

module.exports = {
  getTransactions,
  getTransactionsByProductId,
  getTransactionsByServiceId,
  getTransactionsByFleetId,
};
