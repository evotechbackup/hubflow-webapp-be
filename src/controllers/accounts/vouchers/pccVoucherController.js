const Account = require('../../../models/accounts/Account');
const CostCenter = require('../../../models/accounts/CostCenter');
const PCC = require('../../../models/accounts/PCC');
const PCCVoucher = require('../../../models/accounts/PCCVoucher');
const Transaction = require('../../../models/accounts/Transaction');
const LastInsertedID = require('../../../models/master/LastInsertedID');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../../utils/approvalUtils');
const { createActivityLog } = require('../../../utils/logUtils');

const { asyncHandler } = require('../../../middleware/errorHandler');
const { NotFoundError } = require('../../../utils/errors');

const approvePCCVoucher = async (updatedPCCVoucher) => {
  const pccAccount = await Account.findByIdAndUpdate(
    updatedPCCVoucher.pccAccount,
    { $inc: { amount: -updatedPCCVoucher.remainingAmount } },
    { new: true }
  );

  const transaction = new Transaction({
    account: pccAccount._id,
    id: updatedPCCVoucher.employeeName || '',
    reference: updatedPCCVoucher.id,
    type: 'pccvoucher',
    credit: updatedPCCVoucher.remainingAmount,
    runningBalance: pccAccount?.amount,
    organization: updatedPCCVoucher.organization,
    company: updatedPCCVoucher.company,
  });
  await transaction.save();

  updatedPCCVoucher.transactions.push(transaction._id);

  const paidToAccount = await Account.findByIdAndUpdate(
    updatedPCCVoucher.paidTo,
    { $inc: { amount: updatedPCCVoucher.remainingAmount } },
    { new: true }
  );

  const paidToAccountTransaction = new Transaction({
    account: paidToAccount._id,
    id: updatedPCCVoucher.employeeName || '',
    reference: updatedPCCVoucher.id,
    type: 'pccvoucher',
    debit: updatedPCCVoucher.remainingAmount,
    runningBalance: paidToAccount?.amount,
    organization: updatedPCCVoucher.organization,
    company: updatedPCCVoucher.company,
  });
  await paidToAccountTransaction.save();

  updatedPCCVoucher.transactions.push(paidToAccountTransaction._id);
  await updatedPCCVoucher.save();

  if (updatedPCCVoucher.costCenter && updatedPCCVoucher.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      updatedPCCVoucher.costCenter,
      {
        $push: {
          expense: {
            expenseId: updatedPCCVoucher.id,
            account: updatedPCCVoucher.pccAccount,
            amount: updatedPCCVoucher.remainingAmount,
            date: updatedPCCVoucher.date,
            otherId: updatedPCCVoucher._id,
          },
        },
        $inc: {
          totalExpense: -Number(updatedPCCVoucher.remainingAmount),
        },
      },
      { new: true }
    );
  }
};

const createPCCVoucher = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedID.findOne({
    entity: 'pccvoucher',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedID({
      entity: 'pccvoucher',
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
  const pccPrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }

  const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  const {
    date,
    pccAccount,
    paidTo,
    pccId,
    amount,
    remainingAmount,
    employeeName,
    employee = null,
    notes = '',
    company,
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  const hasApproval = await ifHasApproval('pettycashvoucher', organization);

  const pccVoucher = new PCCVoucher({
    id: customID ? customID : pccPrefix + paddedId,
    date,
    pccAccount,
    paidTo,
    pccId,
    amount,
    remainingAmount,
    employee,
    employeeName,
    notes,
    company,
    organization,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
    paymentMode,
    costCenter,
  });

  const savedPCCVoucher = await pccVoucher.save();

  await PCC.findByIdAndUpdate(
    pccId,
    { $set: { status: 'fulfilled' } },
    { new: true }
  );

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'pettycashvoucher',
      'pending',
      savedPCCVoucher.organization,
      savedPCCVoucher.company,
      savedPCCVoucher.id,
      'PCCVoucher',
      'pettycashvoucher',
      savedPCCVoucher._id
    );
  } else {
    await approvePCCVoucher(savedPCCVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'pccvoucher',
    actionId: savedPCCVoucher.id,
    organization: savedPCCVoucher.organization,
    company: savedPCCVoucher.company,
  });

  res.status(201).json({
    success: true,
    message: 'PCCVoucher created successfully',
    data: savedPCCVoucher,
  });
});

const updatePCCVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    date,
    pccAccount,
    paidTo,
    amount,
    remainingAmount,
    notes = '',
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  const pccVoucher = await PCCVoucher.findById(id);
  if (!pccVoucher) {
    throw new NotFoundError('PCCVoucher not found');
  }

  if (
    pccVoucher.approval === 'approved1' ||
    pccVoucher.approval === 'approved2' ||
    pccVoucher.approval === 'none'
  ) {
    await Account.findByIdAndUpdate(
      pccVoucher.paidTo,
      { $inc: { amount: -pccVoucher.remainingAmount } },
      { new: true }
    );

    await Account.findByIdAndUpdate(
      pccVoucher.pccAccount,
      { $inc: { amount: pccVoucher.remainingAmount } },
      { new: true }
    );

    await Transaction.deleteMany({ _id: { $in: pccVoucher.transactions } });

    if (pccVoucher.costCenter && pccVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pccVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pccVoucher.id,
              account: pccVoucher.pccAccount,
              amount: pccVoucher.remainingAmount,
              date: pccVoucher.date,
              otherId: pccVoucher._id,
            },
          },
          $inc: {
            totalExpense: Number(pccVoucher.remainingAmount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'pettycashvoucher',
    pccVoucher.organization
  );

  pccVoucher.date = date;
  pccVoucher.pccAccount = pccAccount;
  pccVoucher.paidTo = paidTo;
  pccVoucher.amount = amount;
  pccVoucher.remainingAmount = remainingAmount;
  pccVoucher.notes = notes;
  pccVoucher.docAttached = docAttached;
  pccVoucher.paymentMode = paymentMode;
  pccVoucher.costCenter = costCenter;
  pccVoucher.transactions = [];
  pccVoucher.approval = hasApproval ? 'pending' : 'none';
  pccVoucher.verifiedBy = null;
  pccVoucher.approvedBy1 = null;
  pccVoucher.approvedBy2 = null;
  pccVoucher.verifiedAt = null;
  pccVoucher.approvedAt1 = null;
  pccVoucher.approvedAt2 = null;
  pccVoucher.reviewedBy = null;
  pccVoucher.reviewedAt = null;
  pccVoucher.acknowledgedBy = null;
  pccVoucher.acknowledgedAt = null;
  const savedPCCVoucher = await pccVoucher.save();

  if (!hasApproval) {
    await approvePCCVoucher(savedPCCVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'pccvoucher',
    actionId: savedPCCVoucher.id,
    organization: savedPCCVoucher.organization,
    company: savedPCCVoucher.company,
  });

  res.status(200).json({
    success: true,
    message: 'PCCVoucher updated successfully',
    data: savedPCCVoucher,
  });
});

const updatePCCVoucherRevised = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    date,
    pccAccount,
    paidTo,
    amount,
    remainingAmount,
    notes = '',
    docAttached,
    paymentMode,
    costCenter,
  } = req.body;

  const pccVoucher = await PCCVoucher.findById(id);
  if (!pccVoucher) {
    throw new NotFoundError('PCCVoucher not found');
  }

  const baseId = pccVoucher.id.split('-REV')[0];
  const currentRevision = pccVoucher.id.includes('-REV')
    ? parseInt(pccVoucher.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  if (
    pccVoucher.approval === 'approved1' ||
    pccVoucher.approval === 'approved2' ||
    pccVoucher.approval === 'none'
  ) {
    await Account.findByIdAndUpdate(
      pccVoucher.paidTo,
      { $inc: { amount: -pccVoucher.remainingAmount } },
      { new: true }
    );

    await Account.findByIdAndUpdate(
      pccVoucher.pccAccount,
      { $inc: { amount: pccVoucher.remainingAmount } },
      { new: true }
    );

    await Transaction.deleteMany({ _id: { $in: pccVoucher.transactions } });

    if (pccVoucher.costCenter && pccVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pccVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pccVoucher.id,
              account: pccVoucher.pccAccount,
              amount: pccVoucher.remainingAmount,
              date: pccVoucher.date,
              otherId: pccVoucher._id,
            },
          },
          $inc: {
            totalExpense: Number(pccVoucher.remainingAmount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'pettycashvoucher',
    pccVoucher.organization
  );

  pccVoucher.id = newId;
  pccVoucher.date = date;
  pccVoucher.pccAccount = pccAccount;
  pccVoucher.paidTo = paidTo;
  pccVoucher.amount = amount;
  pccVoucher.remainingAmount = remainingAmount;
  pccVoucher.notes = notes;
  pccVoucher.docAttached = docAttached;
  pccVoucher.paymentMode = paymentMode;
  pccVoucher.costCenter = costCenter;
  pccVoucher.transactions = [];
  pccVoucher.approval = hasApproval ? 'pending' : 'none';
  pccVoucher.verifiedBy = null;
  pccVoucher.approvedBy1 = null;
  pccVoucher.approvedBy2 = null;
  pccVoucher.verifiedAt = null;
  pccVoucher.approvedAt1 = null;
  pccVoucher.approvedAt2 = null;
  pccVoucher.reviewedBy = null;
  pccVoucher.reviewedAt = null;
  pccVoucher.acknowledgedBy = null;
  pccVoucher.acknowledgedAt = null;
  const savedPCCVoucher = await pccVoucher.save();

  if (!hasApproval) {
    await approvePCCVoucher(savedPCCVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'pccvoucher',
    actionId: savedPCCVoucher.id,
    organization: savedPCCVoucher.organization,
    company: savedPCCVoucher.company,
  });

  res.status(200).json({
    success: true,
    message: 'PCCVoucher updated successfully',
    data: savedPCCVoucher,
  });
});

const getPCCVoucherById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const pccs = await PCCVoucher.findById(id)
    .populate('pccId', ['id'])
    .populate('pccAccount', ['accountName'])
    .populate('paidTo', ['accountName'])
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
    message: 'PCCVoucher fetched successfully',
    data: pccs,
  });
});

const getPCCVouchers = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const pccs = await PCCVoucher.find({
    organization: orgid,
    valid: true,
  })
    .populate('pccAccount', ['accountName'])
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    message: 'PCCVouchers fetched successfully',
    data: pccs,
  });
});

const approvePCCVoucherStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user, approval } = req.body;

  const pccVoucher = await PCCVoucher.findById(id);

  if (!pccVoucher) {
    throw new NotFoundError('PCCVoucher not found');
  }

  const oldApproval = pccVoucher.approval;

  pccVoucher.approval = approval;
  if (approval === 'approved1') {
    pccVoucher.approvedBy1 = user || null;
    pccVoucher.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    pccVoucher.approvedBy2 = user || null;
    pccVoucher.approvedAt2 = new Date();
  }

  const updatedPCCVoucher = await pccVoucher.save();

  if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
    await approvePCCVoucher(updatedPCCVoucher);

    if (approval === 'approved1') {
      await findNextApprovalLevelAndNotify(
        'pettycashvoucher',
        approval,
        updatedPCCVoucher.organization,
        updatedPCCVoucher.company,
        updatedPCCVoucher.id,
        'PCCVoucher',
        'pettycashvoucher',
        updatedPCCVoucher._id
      );
    }
  }
  res.status(200).json({
    success: true,
    message: 'PCCVoucher status updated successfully',
    data: updatedPCCVoucher,
  });
});

const rejectPCCVoucherStatus = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;

  const pccVoucher = await PCCVoucher.findById(req.params.id);

  if (!pccVoucher) {
    throw new NotFoundError('PCCVoucher not found');
  }

  if (
    pccVoucher.approval === 'approved1' ||
    pccVoucher.approval === 'approved2'
  ) {
    await Account.findByIdAndUpdate(
      pccVoucher.paidTo,
      { $inc: { amount: -pccVoucher.remainingAmount } },
      { new: true }
    );

    await Account.findByIdAndUpdate(
      pccVoucher.pccAccount,
      { $inc: { amount: pccVoucher.remainingAmount } },
      { new: true }
    );

    await Transaction.deleteMany({ _id: { $in: pccVoucher.transactions } });

    if (pccVoucher.costCenter && pccVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pccVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pccVoucher.id,
              account: pccVoucher.pccAccount,
              amount: pccVoucher.remainingAmount,
              date: pccVoucher.date,
              otherId: pccVoucher._id,
            },
          },
          $inc: {
            totalExpense: Number(pccVoucher.remainingAmount),
          },
        },
        { new: true }
      );
    }
  }

  pccVoucher.transactions = [];
  pccVoucher.approval = 'rejected';
  pccVoucher.approvalComment = approvalComment || null;
  pccVoucher.verifiedBy = null;
  pccVoucher.approvedBy1 = null;
  pccVoucher.approvedBy2 = null;
  pccVoucher.verifiedAt = null;
  pccVoucher.approvedAt1 = null;
  pccVoucher.approvedAt2 = null;
  pccVoucher.reviewedBy = null;
  pccVoucher.reviewedAt = null;
  pccVoucher.acknowledgedBy = null;
  pccVoucher.acknowledgedAt = null;
  await pccVoucher.save();

  res.status(200).json({
    success: true,
    message: 'PCCVoucher status updated successfully',
    data: pccVoucher,
  });
});

const invalidatePCCVoucher = asyncHandler(async (req, res) => {
  const pccVoucher = await PCCVoucher.findById(req.params.id);

  if (!pccVoucher) {
    throw new NotFoundError('PCCVoucher not found');
  }

  if (
    pccVoucher.approval === 'approved1' ||
    pccVoucher.approval === 'approved2' ||
    pccVoucher.approval === 'none'
  ) {
    await Account.findByIdAndUpdate(
      pccVoucher.paidTo,
      { $inc: { amount: -pccVoucher.remainingAmount } },
      { new: true }
    );

    await Account.findByIdAndUpdate(
      pccVoucher.pccAccount,
      { $inc: { amount: pccVoucher.remainingAmount } },
      { new: true }
    );

    await Transaction.deleteMany({ _id: { $in: pccVoucher.transactions } });

    if (pccVoucher.costCenter && pccVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        pccVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: pccVoucher.id,
              account: pccVoucher.pccAccount,
              amount: pccVoucher.remainingAmount,
              date: pccVoucher.date,
              otherId: pccVoucher._id,
            },
          },
          $inc: {
            totalExpense: Number(pccVoucher.remainingAmount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'pettycashvoucher',
    pccVoucher.organization
  );

  pccVoucher.valid = false;
  pccVoucher.transactions = [];
  pccVoucher.approval = hasApproval ? 'rejected' : 'none';
  pccVoucher.verifiedBy = null;
  pccVoucher.approvedBy1 = null;
  pccVoucher.approvedBy2 = null;
  pccVoucher.verifiedAt = null;
  pccVoucher.approvedAt1 = null;
  pccVoucher.approvedAt2 = null;
  pccVoucher.reviewedBy = null;
  pccVoucher.reviewedAt = null;
  pccVoucher.acknowledgedBy = null;
  pccVoucher.acknowledgedAt = null;
  await pccVoucher.save();

  res.status(200).json({
    success: true,
    message: 'PCCVoucher status updated successfully',
    data: pccVoucher,
  });
});

const updatePCCVoucherApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { approval, approvalComment } = req.body;

  const pccVoucher = await PCCVoucher.findById(id);

  if (!pccVoucher) {
    throw new NotFoundError('PCCVoucher not found');
  }

  const resetFields = () => {
    pccVoucher.verifiedBy = null;
    pccVoucher.approvedBy1 = null;
    pccVoucher.approvedBy2 = null;
    pccVoucher.verifiedAt = null;
    pccVoucher.approvedAt1 = null;
    pccVoucher.approvedAt2 = null;
    pccVoucher.reviewedBy = null;
    pccVoucher.reviewedAt = null;
    pccVoucher.acknowledgedBy = null;
    pccVoucher.acknowledgedAt = null;
  };

  pccVoucher.approval = approval;
  if (approval === 'acknowledged') {
    pccVoucher.acknowledgedBy = req.id;
    pccVoucher.acknowledgedAt = new Date();
  } else if (approval === 'reviewed') {
    pccVoucher.reviewedBy = req.id;
    pccVoucher.reviewedAt = new Date();
    pccVoucher.verifiedBy = null;
    pccVoucher.verifiedAt = null;
    pccVoucher.acknowledgedBy = null;
    pccVoucher.acknowledgedAt = null;
  } else if (approval === 'verified') {
    pccVoucher.verifiedBy = req.id;
    pccVoucher.verifiedAt = new Date();
    pccVoucher.acknowledgedBy = null;
    pccVoucher.acknowledgedAt = null;
  } else if (approval === 'correction') {
    pccVoucher.approvalComment = approvalComment || null;
    resetFields();
  }

  await pccVoucher.save();

  await findNextApprovalLevelAndNotify(
    'pettycashvoucher',
    approval,
    pccVoucher.organization,
    pccVoucher.company,
    pccVoucher.id,
    'PCCVoucher',
    'pettycashvoucher',
    pccVoucher._id
  );

  res.status(200).json({
    success: true,
    message: 'PCCVoucher approval updated successfully',
    data: pccVoucher,
  });
});

module.exports = {
  createPCCVoucher,
  updatePCCVoucher,
  updatePCCVoucherRevised,
  getPCCVoucherById,
  getPCCVouchers,
  approvePCCVoucherStatus,
  rejectPCCVoucherStatus,
  invalidatePCCVoucher,
  updatePCCVoucherApproval,
};
