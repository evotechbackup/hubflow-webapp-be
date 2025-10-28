const ExpenseVoucher = require('../../../models/accounts/ExpenseVoucher');
const Transaction = require('../../../models/accounts/Transaction');
const Account = require('../../../models/accounts/Account');
const CostCenter = require('../../../models/accounts/CostCenter');
const LastInsertedID = require('../../../models/master/LastInsertedID');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../../utils/approvalUtils');
const { createActivityLog } = require('../../../utils/logUtils');
const Expense = require('../../../models/accounts/Expense');
const { asyncHandler } = require('../../../middleware/errorHandler');
const { NotFoundError, ValidationError } = require('../../../utils/errors');

const approveExpenseVoucher = async (updatedExpenseVoucher) => {
  let employee;

  // if (updatedExpenseVoucher.employeeExpenseId) {
  //   const employeeExpense = await EmployeeExpense.findById(
  //     updatedExpenseVoucher.employeeExpenseId
  //   ).populate('employee', ['firstName', 'lastName']);
  //   if (employeeExpense) {
  //     employee =
  //       employeeExpense.employee?.firstName +
  //       ' ' +
  //       employeeExpense.employee?.lastName;
  //   }
  // }
  // }

  const [accountUpdate, paidThroughAccountUpdate] = await Promise.all([
    Account.findByIdAndUpdate(
      updatedExpenseVoucher.expenseAccount,
      { $inc: { amount: updatedExpenseVoucher.amount } },
      { new: true }
    ),
    Account.findByIdAndUpdate(
      updatedExpenseVoucher.paidThrough,
      { $inc: { amount: -updatedExpenseVoucher.amount } },
      { new: true }
    ),
  ]);

  const [savedDebit, savedCredit] = await Promise.all([
    new Transaction({
      reference: updatedExpenseVoucher.id,
      account: updatedExpenseVoucher.expenseAccount,
      id: employee || '',
      type: 'expensevoucher',
      debit: updatedExpenseVoucher.amount,
      runningBalance: accountUpdate?.amount,
      organization: updatedExpenseVoucher.organization,
      company: updatedExpenseVoucher.company,
    }).save(),
    new Transaction({
      reference: updatedExpenseVoucher.id,
      account: updatedExpenseVoucher.paidThrough,
      id: employee || '',
      type: 'expensevoucher',
      credit: updatedExpenseVoucher.amount,
      runningBalance: paidThroughAccountUpdate?.amount,
      organization: updatedExpenseVoucher.organization,
      company: updatedExpenseVoucher.company,
    }).save(),
  ]);

  updatedExpenseVoucher.transactions.push(savedDebit._id);
  updatedExpenseVoucher.transactions.push(savedCredit._id);

  await updatedExpenseVoucher.save();

  if (
    updatedExpenseVoucher.costCenter &&
    updatedExpenseVoucher.costCenter !== ''
  ) {
    await CostCenter.findByIdAndUpdate(
      updatedExpenseVoucher.costCenter,
      {
        $push: {
          expense: {
            expenseId: updatedExpenseVoucher.id,
            expensevoucher: updatedExpenseVoucher._id,
            amount: updatedExpenseVoucher.amount,
            account: updatedExpenseVoucher.expenseAccount,
            date: updatedExpenseVoucher.date,
          },
        },
        $inc: {
          totalExpense: Number(updatedExpenseVoucher.amount),
        },
      },
      { new: true }
    );
  }
};

const createExpenseVoucher = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedID.findOne({
    entity: 'expensevoucher',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedID({
      entity: 'expensevoucher',
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
  const expensePrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }

  const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  const {
    date,
    expenseAccount,
    amount,
    paidThrough,
    company,
    costCenter = null,
    type,
    expenseId,
    employeeExpenseId,
    projectExpenseId,
    paymentMode,
    docAttached,
  } = req.body;

  const hasApproval = await ifHasApproval('expensevoucher', organization);

  const expenseVoucher = new ExpenseVoucher({
    id: customID ? customID : expensePrefix + paddedId,
    date,
    expenseAccount,
    amount,
    paidThrough,
    type,
    expenseId,
    employeeExpenseId,
    projectExpenseId,
    company,
    organization,
    costCenter,
    paymentMode,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
  });

  const savedExpenseVoucher = await expenseVoucher.save();

  if (type === 'expense') {
    await Expense.findByIdAndUpdate(
      expenseId,
      { $set: { status: 'fulfilled' } },
      { new: true }
    );
  } else if (type === 'employeeexpense') {
    // await EmployeeExpense.findByIdAndUpdate(
    //   employeeExpenseId,
    //   { $set: { status: 'fulfilled' } },
    //   { new: true }
    // );
  }

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'expensevoucher',
      'pending',
      savedExpenseVoucher.organization,
      savedExpenseVoucher.company,
      savedExpenseVoucher.id,
      'Expense Voucher',
      'expense',
      savedExpenseVoucher._id
    );
  } else {
    await approveExpenseVoucher(savedExpenseVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'expensevoucher',
    actionId: savedExpenseVoucher.id,
    organization: savedExpenseVoucher.organization,
    company: savedExpenseVoucher.company,
  });

  res.status(201).json({
    success: true,
    message: 'Expense voucher created successfully',
    data: savedExpenseVoucher,
  });
});

const updateExpenseVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    date,
    expenseAccount,
    amount,
    paidThrough,
    costCenter = null,
    type,
    paymentMode,
    docAttached,
  } = req.body;

  // Validate required fields
  if (!date || !expenseAccount || !amount || !paidThrough) {
    throw new ValidationError('Missing required fields');
  }

  const expenseVoucher = await ExpenseVoucher.findById(id);

  if (!expenseVoucher) {
    throw new NotFoundError('Expense Voucher not found');
  }

  if (
    expenseVoucher.approval === 'approved1' ||
    expenseVoucher.approval === 'approved2' ||
    expenseVoucher.approval === 'none'
  ) {
    await Promise.all([
      Account.findByIdAndUpdate(
        expenseVoucher.expenseAccount,
        { $inc: { amount: -expenseVoucher.amount } },
        { new: true }
      ),
      Account.findByIdAndUpdate(
        expenseVoucher.paidThrough,
        { $inc: { amount: expenseVoucher.amount } },
        { new: true }
      ),
    ]);

    await Transaction.deleteMany({
      _id: { $in: expenseVoucher.transactions },
    });

    if (expenseVoucher.costCenter && expenseVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        expenseVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: expenseVoucher.id,
              expensevoucher: expenseVoucher._id,
              amount: expenseVoucher.amount,
              account: expenseVoucher.expenseAccount,
              date: expenseVoucher.date,
            },
          },
          $inc: {
            totalExpense: Number(-expenseVoucher.amount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'expensevoucher',
    expenseVoucher.organization
  );

  expenseVoucher.date = date;
  expenseVoucher.expenseAccount = expenseAccount;
  expenseVoucher.amount = amount;
  expenseVoucher.paidThrough = paidThrough;
  expenseVoucher.costCenter = costCenter;
  expenseVoucher.type = type;
  expenseVoucher.paymentMode = paymentMode;
  expenseVoucher.docAttached = docAttached;
  expenseVoucher.transactions = [];
  expenseVoucher.approval = hasApproval ? 'pending' : 'none';
  expenseVoucher.verifiedBy = null;
  expenseVoucher.approvedBy1 = null;
  expenseVoucher.approvedBy2 = null;
  expenseVoucher.verifiedAt = null;
  expenseVoucher.approvedAt1 = null;
  expenseVoucher.approvedAt2 = null;
  expenseVoucher.reviewedBy = null;
  expenseVoucher.reviewedAt = null;
  expenseVoucher.acknowledgedBy = null;
  expenseVoucher.acknowledgedAt = null;
  await expenseVoucher.save();

  if (!hasApproval) {
    await approveExpenseVoucher(expenseVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'expensevoucher',
    actionId: expenseVoucher.id,
    organization: expenseVoucher.organization,
    company: expenseVoucher.company,
  });

  res.status(200).json({
    success: true,
    message: 'Expense voucher updated successfully',
    data: expenseVoucher,
  });
});

const updateRevisedExpenseVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const {
    date,
    expenseAccount,
    amount,
    paidThrough,
    costCenter = null,
    type,
    paymentMode,
    docAttached,
  } = req.body;

  // Validate required fields
  if (!date || !expenseAccount || !amount || !paidThrough) {
    throw new ValidationError('Missing required fields');
  }

  const expenseVoucher = await ExpenseVoucher.findById(id);

  if (!expenseVoucher) {
    throw new NotFoundError('Expense Voucher not found');
  }

  const baseId = expenseVoucher.id.split('-REV')[0];
  const currentRevision = expenseVoucher.id.includes('-REV')
    ? parseInt(expenseVoucher.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  if (
    expenseVoucher.approval === 'approved1' ||
    expenseVoucher.approval === 'approved2' ||
    expenseVoucher.approval === 'none'
  ) {
    await Promise.all([
      Account.findByIdAndUpdate(
        expenseVoucher.expenseAccount,
        { $inc: { amount: -expenseVoucher.amount } },
        { new: true }
      ),
      Account.findByIdAndUpdate(
        expenseVoucher.paidThrough,
        { $inc: { amount: expenseVoucher.amount } },
        { new: true }
      ),
    ]);

    await Transaction.deleteMany({
      _id: { $in: expenseVoucher.transactions },
    });

    if (expenseVoucher.costCenter && expenseVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        expenseVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: expenseVoucher.id,
              expensevoucher: expenseVoucher._id,
              amount: expenseVoucher.amount,
              account: expenseVoucher.expenseAccount,
              date: expenseVoucher.date,
            },
          },
          $inc: {
            totalExpense: Number(-expenseVoucher.amount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'expensevoucher',
    expenseVoucher.organization
  );

  expenseVoucher.id = newId;
  expenseVoucher.date = date;
  expenseVoucher.expenseAccount = expenseAccount;
  expenseVoucher.amount = amount;
  expenseVoucher.paidThrough = paidThrough;
  expenseVoucher.costCenter = costCenter;
  expenseVoucher.type = type;
  expenseVoucher.paymentMode = paymentMode;
  expenseVoucher.docAttached = docAttached;
  expenseVoucher.transactions = [];
  expenseVoucher.approval = hasApproval ? 'pending' : 'none';
  expenseVoucher.verifiedBy = null;
  expenseVoucher.approvedBy1 = null;
  expenseVoucher.approvedBy2 = null;
  expenseVoucher.verifiedAt = null;
  expenseVoucher.approvedAt1 = null;
  expenseVoucher.approvedAt2 = null;
  expenseVoucher.reviewedBy = null;
  expenseVoucher.reviewedAt = null;
  expenseVoucher.acknowledgedBy = null;
  expenseVoucher.acknowledgedAt = null;
  await expenseVoucher.save();

  if (!hasApproval) {
    await approveExpenseVoucher(expenseVoucher);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'expensevoucher',
    actionId: expenseVoucher.id,
    organization: expenseVoucher.organization,
    company: expenseVoucher.company,
  });

  res.status(200).json({
    success: true,
    message: 'Expense voucher updated successfully',
    data: expenseVoucher,
  });
});

const getExpenseVoucherById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const expenseVouchers = await ExpenseVoucher.findById(id)
    .populate('paidThrough', ['accountName'])
    .populate('expenseAccount', ['accountName'])
    .populate('costCenter', ['unit'])
    .populate('employeeExpenseId', ['expenses', 'id'])
    .populate('projectExpenseId', ['expenses', 'id'])
    .populate('expenseId', ['expenses', 'id'])
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
      'organizationSeal',
      'organizationSignature',
    ])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName']);
  res.status(200).json({
    success: true,
    message: 'Expense voucher fetched successfully',
    data: expenseVouchers,
  });
});

const getExpenseVouchersByOrgId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const expenseVouchers = await ExpenseVoucher.find({
    organization: orgid,
    valid: true,
  })
    .populate('expenseAccount', ['accountName'])
    .populate('paidThrough', ['accountName'])
    .sort({ date: -1 });

  res.json({
    success: true,
    message: 'Expense vouchers fetched successfully',
    data: expenseVouchers,
  });
});

const approveExpenseVoucherStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user, approval } = req.body;

  const expenseVoucher = await ExpenseVoucher.findById(id);

  if (!expenseVoucher) {
    throw new NotFoundError('Expense Voucher not found');
  }

  const oldApproval = expenseVoucher.approval;

  expenseVoucher.approval = approval;
  if (approval === 'approved1') {
    expenseVoucher.approvedBy1 = user || null;
    expenseVoucher.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    expenseVoucher.approvedBy2 = user || null;
    expenseVoucher.approvedAt2 = new Date();
  }

  const updatedExpenseVoucher = await expenseVoucher.save();

  if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
    await approveExpenseVoucher(updatedExpenseVoucher);

    if (approval === 'approved1') {
      await findNextApprovalLevelAndNotify(
        'expensevoucher',
        approval,
        updatedExpenseVoucher.organization,
        updatedExpenseVoucher.company,
        updatedExpenseVoucher.id,
        'Expense Voucher',
        'expense',
        updatedExpenseVoucher._id
      );
    }
  }

  res.status(200).json({
    success: true,
    message: 'Expense voucher approved successfully',
    data: updatedExpenseVoucher,
  });
});

const rejectExpenseVoucher = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;

  const expenseVoucher = await ExpenseVoucher.findById(req.params.id);

  if (!expenseVoucher) {
    throw new NotFoundError('Expense Voucher not found');
  }

  if (
    expenseVoucher.approval === 'approved1' ||
    expenseVoucher.approval === 'approved2'
  ) {
    await Promise.all([
      Account.findByIdAndUpdate(
        expenseVoucher.expenseAccount,
        { $inc: { amount: -expenseVoucher.amount } },
        { new: true }
      ),
      Account.findByIdAndUpdate(
        expenseVoucher.paidThrough,
        { $inc: { amount: expenseVoucher.amount } },
        { new: true }
      ),
    ]);

    await Transaction.deleteMany({
      _id: { $in: expenseVoucher.transactions },
    });

    expenseVoucher.transactions = [];

    if (expenseVoucher.costCenter && expenseVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        expenseVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: expenseVoucher.id,
              expensevoucher: expenseVoucher._id,
              amount: expenseVoucher.amount,
              account: expenseVoucher.expenseAccount,
              date: expenseVoucher.date,
            },
          },
          $inc: {
            totalExpense: Number(-expenseVoucher.amount),
          },
        },
        { new: true }
      );
    }
  }

  expenseVoucher.approval = 'rejected';
  expenseVoucher.approvalComment = approvalComment || null;
  expenseVoucher.verifiedBy = null;
  expenseVoucher.approvedBy1 = null;
  expenseVoucher.approvedBy2 = null;
  expenseVoucher.verifiedAt = null;
  expenseVoucher.approvedAt1 = null;
  expenseVoucher.approvedAt2 = null;
  expenseVoucher.reviewedBy = null;
  expenseVoucher.reviewedAt = null;
  expenseVoucher.acknowledgedBy = null;
  expenseVoucher.acknowledgedAt = null;
  await expenseVoucher.save();

  res.status(200).json({
    success: true,
    message: 'Expense voucher rejected successfully',
    data: expenseVoucher,
  });
});

const invalidateExpenseVoucher = asyncHandler(async (req, res) => {
  const expenseVoucher = await ExpenseVoucher.findById(req.params.id);

  if (!expenseVoucher) {
    throw new NotFoundError('Expense Voucher not found');
  }

  if (
    expenseVoucher.approval === 'approved1' ||
    expenseVoucher.approval === 'approved2' ||
    expenseVoucher.approval === 'none'
  ) {
    await Promise.all([
      Account.findByIdAndUpdate(
        expenseVoucher.expenseAccount,
        { $inc: { amount: -expenseVoucher.amount } },
        { new: true }
      ),
      Account.findByIdAndUpdate(
        expenseVoucher.paidThrough,
        { $inc: { amount: expenseVoucher.amount } },
        { new: true }
      ),
    ]);

    await Transaction.deleteMany({
      _id: { $in: expenseVoucher.transactions },
    });

    expenseVoucher.transactions = [];

    if (expenseVoucher.costCenter && expenseVoucher.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        expenseVoucher.costCenter,
        {
          $pull: {
            expense: {
              expenseId: expenseVoucher.id,
              expensevoucher: expenseVoucher._id,
              amount: expenseVoucher.amount,
              account: expenseVoucher.expenseAccount,
              date: expenseVoucher.date,
            },
          },
          $inc: {
            totalExpense: Number(-expenseVoucher.amount),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'expensevoucher',
    expenseVoucher.organization
  );

  expenseVoucher.valid = false;
  expenseVoucher.approval = hasApproval ? 'rejected' : 'none';
  expenseVoucher.verifiedBy = null;
  expenseVoucher.approvedBy1 = null;
  expenseVoucher.approvedBy2 = null;
  expenseVoucher.verifiedAt = null;
  expenseVoucher.approvedAt1 = null;
  expenseVoucher.approvedAt2 = null;
  expenseVoucher.reviewedBy = null;
  expenseVoucher.reviewedAt = null;
  expenseVoucher.acknowledgedBy = null;
  expenseVoucher.acknowledgedAt = null;
  await expenseVoucher.save();

  res.status(200).json({
    success: true,
    message: 'Expense voucher invalidated successfully',
    data: expenseVoucher,
  });
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { approval, approvalComment } = req.body;

  const expenseVoucher = await ExpenseVoucher.findById(id);

  if (!expenseVoucher) {
    throw new NotFoundError('Expense Voucher not found');
  }

  const resetFields = () => {
    expenseVoucher.verifiedBy = null;
    expenseVoucher.approvedBy1 = null;
    expenseVoucher.approvedBy2 = null;
    expenseVoucher.verifiedAt = null;
    expenseVoucher.approvedAt1 = null;
    expenseVoucher.approvedAt2 = null;
    expenseVoucher.reviewedBy = null;
    expenseVoucher.reviewedAt = null;
    expenseVoucher.acknowledgedBy = null;
    expenseVoucher.acknowledgedAt = null;
  };

  expenseVoucher.approval = approval;
  if (approval === 'acknowledged') {
    expenseVoucher.acknowledgedBy = req.id;
    expenseVoucher.acknowledgedAt = new Date();
  } else if (approval === 'reviewed') {
    expenseVoucher.reviewedBy = req.id;
    expenseVoucher.reviewedAt = new Date();
    expenseVoucher.verifiedBy = null;
    expenseVoucher.verifiedAt = null;
    expenseVoucher.acknowledgedBy = null;
    expenseVoucher.acknowledgedAt = null;
  } else if (approval === 'verified') {
    expenseVoucher.verifiedBy = req.id;
    expenseVoucher.verifiedAt = new Date();
    expenseVoucher.acknowledgedBy = null;
    expenseVoucher.acknowledgedAt = null;
  } else if (approval === 'correction') {
    expenseVoucher.approvalComment = approvalComment || null;
    resetFields();
  }

  await expenseVoucher.save();

  await findNextApprovalLevelAndNotify(
    'expensevoucher',
    approval,
    expenseVoucher.organization,
    expenseVoucher.company,
    expenseVoucher.id,
    'Expense Voucher',
    'expense',
    expenseVoucher._id
  );

  res.status(200).json({
    success: true,
    message: 'Expense voucher updated successfully',
    data: expenseVoucher,
  });
});

const getFilteredExpenseVouchers = asyncHandler(async (req, res) => {
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
    valid: true,
  };

  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }

  if ((startDate && startDate !== 'null') || (endDate && endDate !== 'null')) {
    query.date = dateFilter;
  }

  const expenseVouchers = await ExpenseVoucher.find(query)
    .populate('expenseAccount', ['accountName'])
    .populate('paidThrough', ['accountName'])
    .populate('costCenter', ['unit'])
    .select(
      'expenseAccount paidThrough amount notes date reference approval id docAttached valid'
    )
    .sort({ date: -1 });

  res.json({
    success: true,
    message: 'Expense vouchers fetched successfully',
    data: expenseVouchers,
  });
});

const getExpenseData = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const expense = await Expense.find({
    organization: orgid,
    status: 'pending',
    valid: true,
  }).select('id');

  // const employeeExpense = await EmployeeExpense.find({
  //   organization: orgId,
  //   status: 'pending',
  // }).select('id');

  res.json({
    success: true,
    message: 'Expense data fetched successfully',
    data: { expense },
  });
});

module.exports = {
  createExpenseVoucher,
  updateExpenseVoucher,
  updateRevisedExpenseVoucher,
  getExpenseVoucherById,
  getExpenseVouchersByOrgId,
  approveExpenseVoucherStatus,
  rejectExpenseVoucher,
  invalidateExpenseVoucher,
  updateApproval,
  getFilteredExpenseVouchers,
  getExpenseData,
};
