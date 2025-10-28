const OpeningBalance = require('../../models/accounts/OpeningBalance');
const Account = require('../../models/accounts/Account');
const Transaction = require('../../models/accounts/Transaction');

const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../../utils/errors');

const createOpeningBalance = asyncHandler(async (req, res) => {
  const { date, records, organization, company } = req.body;

  if (!date || !Array.isArray(records) || !organization || !company) {
    throw new ValidationError('Missing required fields');
  }

  // Create OpeningBalance document first (without transactions)
  const openingBalance = new OpeningBalance({
    date,
    records,
    organization,
    company,
  });

  await openingBalance.save();

  // Prepare transactions in bulk
  const transactionsToInsert = records.map((record) => ({
    reference: '-',
    id: '-',
    account: record.accountId,
    debit: record.debit || 0,
    credit: record.credit || 0,
    type: 'opening-balance',
    runningBalance: Math.max(record.debit || 0, record.credit || 0),
    organization,
    company,
    createdAt: date,
    updatedAt: date,
  }));

  // Insert all transactions at once
  const insertedTransactions =
    await Transaction.insertMany(transactionsToInsert);

  // Collect transaction IDs
  const transactionList = insertedTransactions.map((t) => t._id);

  // Update account amounts in bulk
  const bulkAccountOps = records.map((record) => ({
    updateOne: {
      filter: { _id: record.accountId },
      update: {
        $set: { amount: Math.max(record.debit || 0, record.credit || 0) },
      },
    },
  }));

  if (bulkAccountOps.length > 0) {
    await Account.bulkWrite(bulkAccountOps);
  }

  // Update OpeningBalance with transaction references
  openingBalance.transactions = transactionList;
  await openingBalance.save();

  res.status(201).json({
    success: true,
    message: 'Opening balance created successfully',
    data: openingBalance,
  });
});

const updateOpeningBalance = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { records } = req.body;

  // Find the opening balance for the given organization
  const openingBalance = await OpeningBalance.findOne({
    organization: orgid,
  });

  if (!openingBalance) {
    throw new NotFoundError('Opening balance not found');
  }

  openingBalance.records = records;
  await openingBalance.save();

  // delete all transactions
  await Transaction.deleteMany({
    _id: {
      $in: openingBalance.transactions,
    },
  });

  // create new transactions
  const transactionsToInsert = records.map((record) => ({
    reference: '-',
    id: '-',
    account: record.accountId,
    debit: record.debit || 0,
    credit: record.credit || 0,
    type: 'opening-balance',
    runningBalance: Math.max(record.debit || 0, record.credit || 0),
    organization: orgid,
    company: openingBalance.company,
    createdAt: openingBalance.date,
    updatedAt: openingBalance.date,
  }));

  const insertedTransactions =
    await Transaction.insertMany(transactionsToInsert);

  // Update account amounts in bulk
  const bulkAccountOps = records.map((record) => ({
    updateOne: {
      filter: { _id: record.accountId },
      update: {
        $set: { amount: Math.max(record.debit || 0, record.credit || 0) },
      },
    },
  }));

  if (bulkAccountOps.length > 0) {
    await Account.bulkWrite(bulkAccountOps);
  }

  // Update the opening balance document with the new transaction references
  openingBalance.transactions = insertedTransactions.map((t) => t._id);
  await openingBalance.save();

  res.status(200).json({
    success: true,
    message: 'Opening balance updated successfully',
    data: openingBalance,
  });
});

const getOpeningBalances = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const openingBalance = await OpeningBalance.findOne({
    organization: orgid,
  })
    .populate('records.accountId', ['accountName', 'accountCode'])
    .select('-transactions');

  res.status(200).json({
    success: true,
    message: 'Opening balance fetched successfully',
    data: openingBalance,
  });
});

const getOpeningBalanceById = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const openingBalance = await OpeningBalance.findOne({
    organization: orgid,
  })
    .select('-transactions')
    .lean();

  const accounts = await Account.find({
    organization: orgid,
  }).distinct('_id');

  const transactions = await Transaction.find({
    account: {
      $in: accounts,
    },
    type: {
      $ne: 'opening-balance',
    },
  }).distinct('account');

  res.status(200).json({
    success: true,
    message: 'Opening balance fetched successfully',
    data: { openingBalance, transactions },
  });
});

module.exports = {
  createOpeningBalance,
  updateOpeningBalance,
  getOpeningBalances,
  getOpeningBalanceById,
};
