const Journal = require('../../models/accounts/Journal');
const Account = require('../../models/accounts/Account');
const LastInsertedId = require('../../models/master/LastInsertedID');
const Transaction = require('../../models/accounts/Transaction');
const { createActivityLog } = require('../../utils/logUtils');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const createJournal = asyncHandler(async (req, res) => {
  const {
    date,
    reference,
    notes,
    items,
    subtotal,
    company,
    organization,
    docAttached,
  } = req.body;

  const { id, customID } = req.body;

  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'Journal',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({ entity: 'Journal', organization });
  }
  if (id !== undefined && !isNaN(parseInt(id))) {
    lastInsertedId.lastId = parseInt(id);
    await lastInsertedId.save();
  } else {
    lastInsertedId.lastId += 1;
    await lastInsertedId.save();
  }
  const { prefix } = req.body;
  const salesOrderPrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }
  const paddedId = String(lastInsertedId.lastId).padStart(3, '0');
  const journal = new Journal({
    date,
    reference,
    notes,
    items,
    subtotal,
    id: customID ? customID : salesOrderPrefix + paddedId,
    company,
    organization,
    docAttached,
  });

  const savedJournal = await journal.save();

  const transactions = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const account = await Account.findById(item.accountId);

    // Determine if the account normally has a debit or credit balance
    const isDebitNormalAccount = [
      'asset',
      'othercurrentasset',
      'stock',
      'cashandbank',
      'fixedasset',
      'expense',
      'costofgoodssold',
    ].includes(account.accountType);

    if (item.debit > 0) {
      account.debit += Number(item.debit);
      if (isDebitNormalAccount) {
        account.amount += Number(item.debit);
      } else {
        account.amount -= Number(item.debit);
      }
    } else {
      account.credit += Number(item.credit);
      if (isDebitNormalAccount) {
        account.amount -= Number(item.credit);
      } else {
        account.amount += Number(item.credit);
      }

      if (account.accountType === 'ownersequity') {
        await Account.findOneAndUpdate(
          { accountName: 'Drawings', organization },
          { $inc: { amount: Number(item.debit) } },
          { upsert: true }
        );
      }
    }

    await account.save();

    const transaction = new Transaction({
      reference: savedJournal.id,
      account: item.accountId,
      type: 'journal',
      id: savedJournal.reference,
      debit: item.debit,
      credit: item.credit,
      runningBalance: account?.amount,
      organization: savedJournal.organization,
      company: savedJournal.company,
    });
    await transaction.save();
    transactions.push(transaction._id);
  }

  savedJournal.transactions = transactions;
  await savedJournal.save();

  await createActivityLog({
    userId: req._id,
    action: 'create',
    type: 'journal',
    actionId: savedJournal.id,
    organization: savedJournal.organization,
    company: savedJournal.company,
  });

  res.status(201).json({
    success: true,
    message: 'Journal entry created successfully',
    data: savedJournal,
  });
});

// Edit a journal entry
const updateJournal = asyncHandler(async (req, res) => {
  const journalId = req.params.id;
  const { date, reference, notes, items, subtotal, docAttached } = req.body;

  // Find the existing journal entry
  const existingJournal = await Journal.findById(journalId);
  if (!existingJournal) {
    throw new NotFoundError('Journal entry not found');
  }

  // 1. Revert the original account changes
  for (let i = 0; i < existingJournal.items.length; i++) {
    const item = existingJournal.items[i];
    const account = await Account.findById(item.accountId);

    if (!account) {
      continue; // Skip if account no longer exists
    }

    const isDebitNormalAccount = [
      'asset',
      'othercurrentasset',
      'stock',
      'cashandbank',
      'fixedasset',
      'expense',
      'costofgoodssold',
    ].includes(account.accountType);

    // Reverse the original entries
    if (item.debit > 0) {
      account.debit -= Number(item.debit);
      if (isDebitNormalAccount) {
        account.amount -= Number(item.debit);
      } else {
        account.amount += Number(item.debit);
      }
    } else {
      account.credit -= Number(item.credit);
      if (isDebitNormalAccount) {
        account.amount += Number(item.credit);
      } else {
        account.amount -= Number(item.credit);
      }

      // Revert drawings entry if it was an owners equity account
      if (account.accountType === 'ownersequity') {
        await Account.findOneAndUpdate(
          {
            accountName: 'Drawings',
            organization: existingJournal.organization,
          },
          { $inc: { amount: -Number(item.debit) } }
        );
      }
    }

    await account.save();
  }

  // 2. Delete the original transactions
  await Transaction.deleteMany({
    _id: { $in: existingJournal.transactions },
  });

  // 3. Update the journal entry
  existingJournal.date = date;
  existingJournal.reference = reference;
  existingJournal.notes = notes;
  existingJournal.items = items;
  existingJournal.subtotal = subtotal;
  existingJournal.docAttached = docAttached;

  const transactions = [];

  // 4. Apply new account changes and create new transactions
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const account = await Account.findById(item.accountId);

    if (!account) {
      continue; // Skip if account doesn't exist
    }

    const isDebitNormalAccount = [
      'asset',
      'othercurrentasset',
      'stock',
      'cashandbank',
      'fixedasset',
      'expense',
      'costofgoodssold',
    ].includes(account.accountType);

    if (item.debit > 0) {
      account.debit += Number(item.debit);
      if (isDebitNormalAccount) {
        account.amount += Number(item.debit);
      } else {
        account.amount -= Number(item.debit);
      }
    } else {
      account.credit += Number(item.credit);
      if (isDebitNormalAccount) {
        account.amount -= Number(item.credit);
      } else {
        account.amount += Number(item.credit);
      }

      if (account.accountType === 'ownersequity') {
        await Account.findOneAndUpdate(
          {
            accountName: 'Drawings',
            organization: existingJournal.organization,
          },
          { $inc: { amount: Number(item.debit) } },
          { upsert: true }
        );
      }
    }

    await account.save();

    const transaction = new Transaction({
      reference: existingJournal.id,
      account: item.accountId,
      type: 'journal',
      id: existingJournal.reference,
      debit: item.debit,
      credit: item.credit,
      runningBalance: account?.amount,
      organization: existingJournal.organization,
      company: existingJournal.company,
    });
    await transaction.save();
    transactions.push(transaction._id);
  }

  existingJournal.transactions = transactions;
  const savedJournal = await existingJournal.save();

  // Create activity log for the edit
  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'journal',
    actionId: savedJournal.id,
    organization: savedJournal.organization,
    company: savedJournal.company,
  });

  res.status(200).json({
    success: true,
    message: 'Journal entry updated successfully',
    data: savedJournal,
  });
});

const updateJournalRevised = asyncHandler(async (req, res) => {
  const journalId = req.params.id;
  const { date, reference, notes, items, subtotal, docAttached } = req.body;

  // Find the existing journal entry
  const existingJournal = await Journal.findById(journalId);
  if (!existingJournal) {
    throw new NotFoundError('Journal entry not found');
  }

  const baseId = existingJournal.id.split('-REV')[0];
  const currentRevision = existingJournal.id.includes('-REV')
    ? parseInt(existingJournal.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  // 1. Revert the original account changes
  for (let i = 0; i < existingJournal.items.length; i++) {
    const item = existingJournal.items[i];
    const account = await Account.findById(item.accountId);

    if (!account) {
      continue; // Skip if account no longer exists
    }

    const isDebitNormalAccount = [
      'asset',
      'othercurrentasset',
      'stock',
      'cashandbank',
      'fixedasset',
      'expense',
      'costofgoodssold',
    ].includes(account.accountType);

    // Reverse the original entries
    if (item.debit > 0) {
      account.debit -= Number(item.debit);
      if (isDebitNormalAccount) {
        account.amount -= Number(item.debit);
      } else {
        account.amount += Number(item.debit);
      }
    } else {
      account.credit -= Number(item.credit);
      if (isDebitNormalAccount) {
        account.amount += Number(item.credit);
      } else {
        account.amount -= Number(item.credit);
      }

      // Revert drawings entry if it was an owners equity account
      if (account.accountType === 'ownersequity') {
        await Account.findOneAndUpdate(
          {
            accountName: 'Drawings',
            organization: existingJournal.organization,
          },
          { $inc: { amount: -Number(item.debit) } }
        );
      }
    }

    await account.save();
  }

  // 2. Delete the original transactions
  await Transaction.deleteMany({
    _id: { $in: existingJournal.transactions },
  });

  // 3. Update the journal entry
  existingJournal.date = date;
  existingJournal.reference = reference;
  existingJournal.notes = notes;
  existingJournal.items = items;
  existingJournal.subtotal = subtotal;
  existingJournal.docAttached = docAttached;
  existingJournal.id = newId;

  const transactions = [];

  // 4. Apply new account changes and create new transactions
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const account = await Account.findById(item.accountId);

    if (!account) {
      continue; // Skip if account doesn't exist
    }

    const isDebitNormalAccount = [
      'asset',
      'othercurrentasset',
      'stock',
      'cashandbank',
      'fixedasset',
      'expense',
      'costofgoodssold',
    ].includes(account.accountType);

    if (item.debit > 0) {
      account.debit += Number(item.debit);
      if (isDebitNormalAccount) {
        account.amount += Number(item.debit);
      } else {
        account.amount -= Number(item.debit);
      }
    } else {
      account.credit += Number(item.credit);
      if (isDebitNormalAccount) {
        account.amount -= Number(item.credit);
      } else {
        account.amount += Number(item.credit);
      }

      if (account.accountType === 'ownersequity') {
        await Account.findOneAndUpdate(
          {
            accountName: 'Drawings',
            organization: existingJournal.organization,
          },
          { $inc: { amount: Number(item.debit) } },
          { upsert: true }
        );
      }
    }

    await account.save();

    const transaction = new Transaction({
      reference: newId,
      account: item.accountId,
      type: 'journal',
      id: existingJournal.reference,
      debit: item.debit,
      credit: item.credit,
      runningBalance: account?.amount,
      organization: existingJournal.organization,
      company: existingJournal.company,
    });
    await transaction.save();
    transactions.push(transaction._id);
  }

  existingJournal.transactions = transactions;
  const savedJournal = await existingJournal.save();

  // Create activity log for the edit
  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'journal',
    actionId: newId,
    organization: savedJournal.organization,
    company: savedJournal.company,
  });

  res.status(200).json({
    success: true,
    message: 'Journal entry updated successfully',
    data: savedJournal,
  });
});

// Get all journal entries
const getJournals = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const journals = await Journal.find({
    organization: orgid,
  });
  res.status(200).json({
    success: true,
    message: 'Journals fetched successfully',
    data: journals,
  });
});

const getJournalslipbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const journals = await Journal.findById(id)
    .populate('items.accountId', ['accountName'])
    .populate('organization', [
      'letterheadArabicName',
      'letterheadName',
      'organizationLogo',
      'arabicName',
      'name',
      'cr',
      'vat',
      'mobileNumber',
      'organizationEmail',
      'webURL',
      'pOBox',
      'organizationAddress',
      'procurementColor',
    ]);
  res.status(200).json({
    success: true,
    message: 'Journal fetched successfully',
    data: journals,
  });
});

const getJournalsFilterByDate = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate, search_query } = req.query;

  const dateFilter = {};
  if (startDate && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    organization: orgid,
  };

  if (search_query) {
    query.reference = { $regex: search_query, $options: 'i' };
  }

  if ((startDate && startDate !== 'null') || (endDate && endDate !== 'null')) {
    query.date = dateFilter;
  }

  const journals = await Journal.find(query).sort({ date: -1 });
  res.status(200).json({
    success: true,
    message: 'Journals fetched successfully',
    data: journals,
  });
});

module.exports = {
  createJournal,
  updateJournal,
  updateJournalRevised,
  getJournals,
  getJournalslipbyid,
  getJournalsFilterByDate,
};
