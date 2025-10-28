const Account = require('../../../models/accounts/Account');
const CostCenter = require('../../../models/accounts/CostCenter');
const PCR = require('../../../models/accounts/PCR');
const PCRVoucher = require('../../../models/accounts/PCRVoucher');
const Transaction = require('../../../models/accounts/Transaction');
const LastInsertedID = require('../../../models/master/LastInsertedID');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../../utils/approvalUtils');
const { createActivityLog } = require('../../../utils/logUtils');

const { asyncHandler } = require('../../../middleware/errorHandler');
const { NotFoundError } = require('../../../utils/errors');

const approvePCRVoucher = async (updatedPCRVoucher) => {
  const account = await Account.findByIdAndUpdate(
    updatedPCRVoucher.pcrAccount,
    { $inc: { amount: updatedPCRVoucher.amount } },
    { new: true }
  );

  const transaction = new Transaction({
    account: account._id,
    id: updatedPCRVoucher.employeeName,
    reference: updatedPCRVoucher.id,
    type: 'pcrvoucher',
    debit: updatedPCRVoucher.amount,
    runningBalance: account?.amount,
    organization: updatedPCRVoucher.organization,
    company: updatedPCRVoucher.company,
  });
  await transaction.save();

  updatedPCRVoucher.transactions.push(transaction._id);

  const paidThroughAccount = await Account.findByIdAndUpdate(
    updatedPCRVoucher.paidThrough,
    { $inc: { amount: -updatedPCRVoucher.amount } },
    { new: true }
  );

  const paidThroughTransaction = new Transaction({
    account: paidThroughAccount._id,
    id: updatedPCRVoucher.employeeName || '',
    reference: updatedPCRVoucher.id,
    type: 'pcrvoucher',
    credit: updatedPCRVoucher.amount,
    runningBalance: paidThroughAccount?.amount,
    organization: updatedPCRVoucher.organization,
    company: updatedPCRVoucher.company,
  });
  await paidThroughTransaction.save();

  updatedPCRVoucher.transactions.push(paidThroughTransaction._id);
  await updatedPCRVoucher.save();

  if (updatedPCRVoucher.costCenter && updatedPCRVoucher.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      updatedPCRVoucher.costCenter,
      {
        $push: {
          expense: {
            expenseId: updatedPCRVoucher.id,
            account: updatedPCRVoucher.pcrAccount,
            amount: updatedPCRVoucher.amount,
            date: updatedPCRVoucher.date,
            otherId: updatedPCRVoucher._id,
          },
        },
        $inc: {
          totalExpense: Number(updatedPCRVoucher.amount),
        },
      },
      { new: true }
    );
  }
};

const createPCRVoucher = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedID.findOne({
    entity: 'pcrvoucher',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedID({
      entity: 'pcrvoucher',
      organization,
    });
  }
  if (id !== undefined && !isNaN(parseInt(id))) {
    lastInsertedId.lastId = parseInt(id);
    await lastInsertedId.save();
  } else {
    lastInsertedId.lastId += 1;
    await lastInsertedId.save();
  }
  const { prefix } = req.body;
  const pcrPrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }

  const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  const {
    date,
    pcrAccount,
    paidThrough,
    pcrId,
    amount,
    employeeName,
    employee = null,
    notes = '',
    company,
    order,
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  const hasApproval = await ifHasApproval('pettycashvoucher', organization);

  const pcrVoucher = new PCRVoucher({
    id: customID ? customID : pcrPrefix + paddedId,
    date,
    pcrAccount,
    paidThrough,
    pcrId,
    amount,
    employee,
    employeeName,
    notes,
    company,
    organization,
    order,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
    paymentMode,
    costCenter,
  });

  const savedPCRVoucher = await pcrVoucher.save();

  await PCR.findByIdAndUpdate(
    pcrId,
    { $set: { status: 'fulfilled' } },
    { new: true }
  );

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'pettycashvoucher',
      'pending',
      savedPCRVoucher.organization,
      savedPCRVoucher.company,
      savedPCRVoucher.id,
      'PCRVoucher',
      'pettycashvoucher',
      savedPCRVoucher._id
    );
  } else {
    await approvePCRVoucher(savedPCRVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'pcrvoucher',
    actionId: savedPCRVoucher.id,
    organization: savedPCRVoucher.organization,
    company: savedPCRVoucher.company,
  });

  return res.status(201).json({
    success: true,
    message: 'PCRVoucher created successfully',
    data: savedPCRVoucher,
  });
});

const updatePCRVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    date,
    pcrAccount,
    paidThrough,
    amount,
    notes = '',
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  const pcrVoucher = await PCRVoucher.findById(id);
  if (!pcrVoucher) {
    throw new NotFoundError('PCRVoucher not found');
  }

  if (
    pcrVoucher.approval === 'approved1' ||
    pcrVoucher.approval === 'approved2' ||
    pcrVoucher.approval === 'none'
  ) {
    await Account.findByIdAndUpdate(
      pcrVoucher.paidThrough,
      { $inc: { amount: pcrVoucher.amount } },
      { new: true }
    );

    await Account.findByIdAndUpdate(
      pcrVoucher.pcrAccount,
      { $inc: { amount: -pcrVoucher.amount } },
      { new: true }
    );

    await Transaction.deleteMany({ _id: { $in: pcrVoucher.transactions } });

    if (pcrVoucher.costCenter && pcrVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcrVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcrVoucher.id,
              account: pcrVoucher.pcrAccount,
              amount: pcrVoucher.amount,
              date: pcrVoucher.date,
              otherId: pcrVoucher._id,
            },
          },
          $inc: {
            totalExpense: -Number(pcrVoucher.amount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'pettycashvoucher',
    pcrVoucher.organization
  );

  pcrVoucher.date = date;
  pcrVoucher.pcrAccount = pcrAccount;
  pcrVoucher.paidThrough = paidThrough;
  pcrVoucher.amount = amount;
  pcrVoucher.notes = notes;
  pcrVoucher.docAttached = docAttached;
  pcrVoucher.paymentMode = paymentMode;
  pcrVoucher.transactions = [];
  pcrVoucher.costCenter = costCenter;
  pcrVoucher.approval = hasApproval ? 'pending' : 'none';
  pcrVoucher.verifiedBy = null;
  pcrVoucher.approvedBy1 = null;
  pcrVoucher.approvedBy2 = null;
  pcrVoucher.verifiedAt = null;
  pcrVoucher.approvedAt1 = null;
  pcrVoucher.approvedAt2 = null;
  pcrVoucher.reviewedBy = null;
  pcrVoucher.reviewedAt = null;
  pcrVoucher.acknowledgedBy = null;
  pcrVoucher.acknowledgedAt = null;
  const savedPCRVoucher = await pcrVoucher.save();

  if (!hasApproval) {
    await approvePCRVoucher(savedPCRVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'pcrvoucher',
    actionId: savedPCRVoucher.id,
    organization: savedPCRVoucher.organization,
    company: savedPCRVoucher.company,
  });

  res.status(200).json({
    success: true,
    message: 'PCRVoucher updated successfully',
    data: savedPCRVoucher,
  });
});

const updatePCRVoucherRevised = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    date,
    pcrAccount,
    paidThrough,
    amount,
    notes = '',
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  const pcrVoucher = await PCRVoucher.findById(id);
  if (!pcrVoucher) {
    throw new NotFoundError('PCRVoucher not found');
  }

  const baseId = pcrVoucher.id.split('-REV')[0];
  const currentRevision = pcrVoucher.id.includes('-REV')
    ? parseInt(pcrVoucher.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  if (
    pcrVoucher.approval === 'approved1' ||
    pcrVoucher.approval === 'approved2' ||
    pcrVoucher.approval === 'none'
  ) {
    await Account.findByIdAndUpdate(
      pcrVoucher.paidThrough,
      { $inc: { amount: pcrVoucher.amount } },
      { new: true }
    );

    await Account.findByIdAndUpdate(
      pcrVoucher.pcrAccount,
      { $inc: { amount: -pcrVoucher.amount } },
      { new: true }
    );

    await Transaction.deleteMany({ _id: { $in: pcrVoucher.transactions } });

    if (pcrVoucher.costCenter && pcrVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcrVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcrVoucher.id,
              account: pcrVoucher.pcrAccount,
              amount: pcrVoucher.amount,
              date: pcrVoucher.date,
              otherId: pcrVoucher._id,
            },
          },
          $inc: {
            totalExpense: -Number(pcrVoucher.amount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'pettycashvoucher',
    pcrVoucher.organization
  );

  pcrVoucher.id = newId;
  pcrVoucher.date = date;
  pcrVoucher.pcrAccount = pcrAccount;
  pcrVoucher.paidThrough = paidThrough;
  pcrVoucher.amount = amount;
  pcrVoucher.notes = notes;
  pcrVoucher.docAttached = docAttached;
  pcrVoucher.paymentMode = paymentMode;
  pcrVoucher.costCenter = costCenter;
  pcrVoucher.transactions = [];
  pcrVoucher.approval = hasApproval ? 'pending' : 'none';
  pcrVoucher.verifiedBy = null;
  pcrVoucher.approvedBy1 = null;
  pcrVoucher.approvedBy2 = null;
  pcrVoucher.verifiedAt = null;
  pcrVoucher.approvedAt1 = null;
  pcrVoucher.approvedAt2 = null;
  pcrVoucher.reviewedBy = null;
  pcrVoucher.reviewedAt = null;
  pcrVoucher.acknowledgedBy = null;
  pcrVoucher.acknowledgedAt = null;
  const savedPCRVoucher = await pcrVoucher.save();

  if (!hasApproval) {
    await approvePCRVoucher(savedPCRVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'pcrvoucher',
    actionId: savedPCRVoucher.id,
    organization: savedPCRVoucher.organization,
    company: savedPCRVoucher.company,
  });

  res.status(200).json({
    success: true,
    message: 'PCRVoucher updated successfully',
    data: savedPCRVoucher,
  });
});

const getPCRVoucherById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pcrs = await PCRVoucher.findById(id)
    .populate('pcrId', ['id'])
    .populate('pcrAccount', ['accountName'])
    .populate('paidThrough', ['accountName'])
    .populate('employee', ['firstName', 'lastName'])
    .populate('costCenter', ['unit'])
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
      'organizationSignature',
      'organizationSeal',
    ])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName']);
  res.status(200).json({
    success: true,
    message: 'PCRVoucher fetched successfully',
    data: pcrs,
  });
});

const getPCRVouchers = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const pcrs = await PCRVoucher.find({
    organization: orgid,
    valid: true,
  })
    .populate('paidThrough', ['accountName'])
    .sort({ date: -1 });

  res.json({
    success: true,
    message: 'PCRVouchers fetched successfully',
    data: pcrs,
  });
});

const approvePCRVoucherStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user, approval } = req.body;

  const pcrVoucher = await PCRVoucher.findById(id);

  if (!pcrVoucher) {
    throw new NotFoundError('PCRVoucher not found');
  }

  const oldApproval = pcrVoucher.approval;

  pcrVoucher.approval = approval;
  if (approval === 'approved1') {
    pcrVoucher.approvedBy1 = user || null;
    pcrVoucher.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    pcrVoucher.approvedBy2 = user || null;
    pcrVoucher.approvedAt2 = new Date();
  }

  const updatedPCRVoucher = await pcrVoucher.save();

  if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
    await approvePCRVoucher(updatedPCRVoucher);

    if (approval === 'approved1') {
      await findNextApprovalLevelAndNotify(
        'pettycashvoucher',
        approval,
        updatedPCRVoucher.organization,
        updatedPCRVoucher.company,
        updatedPCRVoucher.id,
        'PCRVoucher',
        'pettycashvoucher',
        updatedPCRVoucher._id
      );
    }
  }
  res.status(200).json({
    success: true,
    message: 'PCRVoucher approved successfully',
    data: updatedPCRVoucher,
  });
});

const rejectPCRVoucher = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;

  const pcrVoucher = await PCRVoucher.findById(req.params.id);

  if (!pcrVoucher) {
    throw new NotFoundError('PCRVoucher not found');
  }

  if (
    pcrVoucher.approval === 'approved1' ||
    pcrVoucher.approval === 'approved2'
  ) {
    await Account.findByIdAndUpdate(
      pcrVoucher.paidThrough,
      { $inc: { amount: pcrVoucher.amount } },
      { new: true }
    );

    await Account.findByIdAndUpdate(
      pcrVoucher.pcrAccount,
      { $inc: { amount: -pcrVoucher.amount } },
      { new: true }
    );

    // Delete all transactions stored in the pcr's transactions array
    await Transaction.deleteMany({ _id: { $in: pcrVoucher.transactions } });

    if (pcrVoucher.costCenter && pcrVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcrVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcrVoucher.id,
              account: pcrVoucher.pcrAccount,
              amount: pcrVoucher.amount,
              date: pcrVoucher.date,
              otherId: pcrVoucher._id,
            },
          },
          $inc: {
            totalExpense: -Number(pcrVoucher.amount),
          },
        },
        { new: true }
      );
    }
  }

  // Clear the transactions array and update approval status
  pcrVoucher.transactions = [];
  pcrVoucher.approval = 'rejected';
  pcrVoucher.approvalComment = approvalComment || null;
  pcrVoucher.verifiedBy = null;
  pcrVoucher.approvedBy1 = null;
  pcrVoucher.approvedBy2 = null;
  pcrVoucher.verifiedAt = null;
  pcrVoucher.approvedAt1 = null;
  pcrVoucher.approvedAt2 = null;
  pcrVoucher.reviewedBy = null;
  pcrVoucher.reviewedAt = null;
  pcrVoucher.acknowledgedBy = null;
  pcrVoucher.acknowledgedAt = null;
  await pcrVoucher.save();

  res.status(200).json({
    success: true,
    message: 'PCRVoucher rejected successfully',
    data: pcrVoucher,
  });
});

const invalidatePCRVoucher = asyncHandler(async (req, res) => {
  const pcrVoucher = await PCRVoucher.findById(req.params.id);

  if (!pcrVoucher) {
    throw new NotFoundError('PCRVoucher not found');
  }

  if (
    pcrVoucher.approval === 'approved1' ||
    pcrVoucher.approval === 'approved2' ||
    pcrVoucher.approval === 'none'
  ) {
    await Account.findByIdAndUpdate(
      pcrVoucher.paidThrough,
      { $inc: { amount: pcrVoucher.amount } },
      { new: true }
    );

    await Account.findByIdAndUpdate(
      pcrVoucher.pcrAccount,
      { $inc: { amount: -pcrVoucher.amount } },
      { new: true }
    );

    // Delete all transactions stored in the pcr's transactions array
    await Transaction.deleteMany({ _id: { $in: pcrVoucher.transactions } });

    if (pcrVoucher.costCenter && pcrVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pcrVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pcrVoucher.id,
              account: pcrVoucher.pcrAccount,
              amount: pcrVoucher.amount,
              date: pcrVoucher.date,
              otherId: pcrVoucher._id,
            },
          },
          $inc: {
            totalExpense: -Number(pcrVoucher.amount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'pettycashvoucher',
    pcrVoucher.organization
  );

  // Clear the transactions array and update approval status
  pcrVoucher.valid = false;
  pcrVoucher.transactions = [];
  pcrVoucher.approval = hasApproval ? 'rejected' : 'none';
  pcrVoucher.verifiedBy = null;
  pcrVoucher.approvedBy1 = null;
  pcrVoucher.approvedBy2 = null;
  pcrVoucher.verifiedAt = null;
  pcrVoucher.approvedAt1 = null;
  pcrVoucher.approvedAt2 = null;
  pcrVoucher.reviewedBy = null;
  pcrVoucher.reviewedAt = null;
  pcrVoucher.acknowledgedBy = null;
  pcrVoucher.acknowledgedAt = null;
  await pcrVoucher.save();

  res.status(200).json({
    success: true,
    message: 'PCRVoucher invalidated successfully',
    data: pcrVoucher,
  });
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { approval, approvalComment } = req.body;

  const pcrVoucher = await PCRVoucher.findById(id);

  if (!pcrVoucher) {
    throw new NotFoundError('PCRVoucher not found');
  }

  const resetFields = () => {
    pcrVoucher.verifiedBy = null;
    pcrVoucher.approvedBy1 = null;
    pcrVoucher.approvedBy2 = null;
    pcrVoucher.verifiedAt = null;
    pcrVoucher.approvedAt1 = null;
    pcrVoucher.approvedAt2 = null;
    pcrVoucher.reviewedBy = null;
    pcrVoucher.reviewedAt = null;
    pcrVoucher.acknowledgedBy = null;
    pcrVoucher.acknowledgedAt = null;
  };

  pcrVoucher.approval = approval;
  if (approval === 'acknowledged') {
    pcrVoucher.acknowledgedBy = req.id;
    // pcrVoucher.pcrAccount = pcraccount;
    // pcrVoucher.paidThrough = paidthroughaccount;
    pcrVoucher.acknowledgedAt = new Date();
  } else if (approval === 'reviewed') {
    pcrVoucher.reviewedBy = req.id;
    pcrVoucher.reviewedAt = new Date();
    pcrVoucher.verifiedBy = null;
    pcrVoucher.verifiedAt = null;
    pcrVoucher.acknowledgedBy = null;
    pcrVoucher.acknowledgedAt = null;
  } else if (approval === 'verified') {
    pcrVoucher.verifiedBy = req.id;
    pcrVoucher.verifiedAt = new Date();
    pcrVoucher.acknowledgedBy = null;
    pcrVoucher.acknowledgedAt = null;
  } else if (approval === 'correction') {
    pcrVoucher.approvalComment = approvalComment || null;
    resetFields();
  }

  await pcrVoucher.save();

  await findNextApprovalLevelAndNotify(
    'pettycashvoucher',
    approval,
    pcrVoucher.organization,
    pcrVoucher.company,
    pcrVoucher.id,
    'PCRVoucher',
    'pettycashvoucher',
    pcrVoucher._id
  );

  res.status(200).json({
    success: true,
    message: 'PCRVoucher approval updated successfully',
    data: pcrVoucher,
  });
});

module.exports = {
  createPCRVoucher,
  updatePCRVoucher,
  updatePCRVoucherRevised,
  getPCRVoucherById,
  getPCRVouchers,
  approvePCRVoucherStatus,
  rejectPCRVoucher,
  invalidatePCRVoucher,
  updateApproval,
};
