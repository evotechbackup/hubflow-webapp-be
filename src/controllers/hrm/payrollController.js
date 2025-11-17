const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Payroll = require('../../models/hrm/Payroll');
const Account = require('../../models/accounts/Account');
const Transaction = require('../../models/accounts/Transaction');
const CostCenter = require('../../models/accounts/CostCenter');
const mongoose = require('mongoose');
const Organization = require('../../models/auth/Organization');
const EmployeeTimesheetRecord = require('../../models/hrm/EmployeeTimesheetRecord');
const WebAttendance = require('../../models/hrm/WebAttendance');
const EmployeeLedger = require('../../models/accounts/EmployeeLedger');
// const { createActivityLog } = require("../../utilities/logUtils");

const monthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const approvePayroll = async (updatedPayroll, session) => {
  const amount =
    updatedPayroll.type === 'advance' || updatedPayroll.type === 'loan'
      ? updatedPayroll.salary
      : updatedPayroll.totalPay || updatedPayroll.salary;

  const salaryPayableAccount = await Account.findOneAndUpdate(
    {
      accountName: 'Salary Payable',
      organization: updatedPayroll.organization,
    },
    { $inc: { amount: `${amount}` } },
    { new: true }
  );

  if (!salaryPayableAccount) {
    throw new Error('Salary Payable account not found');
  }

  let transactionId = '';

  // if (updatedPayroll?.employeeName) {
  //   transactionId = `${updatedPayroll?.employeeName}-${
  //     payrollListType[updatedPayroll?.type]
  //   }`;
  // }

  const createdAt = new Date(updatedPayroll.createdAt);
  transactionId = `${transactionId}-${createdAt.getDate()}-${
    createdAt.getMonth() + 1
  }-${createdAt.getFullYear()}`;

  const transaction = await Transaction.create({
    reference: transactionId,
    account: updatedPayroll.salaryAccount,
    id: updatedPayroll.employeeName,
    type: 'payroll',
    credit: amount,
    runningBalance: updatedPayroll.salaryAccount,
    organization: updatedPayroll.organization,
    company: updatedPayroll.company,
  });

  updatedPayroll.transactions.push(transaction._id);
  await updatedPayroll.save({ session });

  const payrollAccountName =
    updatedPayroll.type === 'advance'
      ? 'Employee Advance'
      : updatedPayroll.type === 'loan'
        ? 'Employee Loan'
        : 'Salary and wages';

  const organization = await Organization.findById(
    updatedPayroll.organization
  ).select('isAccrualAccounting');

  let payrollAccount;

  if (organization.isAccrualAccounting) {
    payrollAccount = updatedPayroll.salaryAccount
      ? await Account.findById(updatedPayroll.salaryAccount).session(session)
      : await Account.findOne({
          accountName: payrollAccountName,
          organization: updatedPayroll.organization,
        }).session(session);
    if (!payrollAccount) {
      await session.abortTransaction();
      session.endSession();
      throw new Error(`${payrollAccountName} account not found`);
    }
    payrollAccount.amount += amount;
    await payrollAccount.save({ session });

    const payrollAccountTransaction = new Transaction({
      reference: `${updatedPayroll.employeeName}`,
      account: payrollAccount._id,
      id: updatedPayroll.employeeName,
      type: 'payroll',
      debit: amount,
      runningBalance: payrollAccount?.amount,
      organization: updatedPayroll.organization,
      company: updatedPayroll.company,
    });
    await payrollAccountTransaction.save({ session });

    updatedPayroll.transactions.push(payrollAccountTransaction._id);
    await updatedPayroll.save({ session });
  }

  if (updatedPayroll.costCenter && updatedPayroll.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      updatedPayroll.costCenter,
      {
        $push: {
          expense: {
            payrollId: updatedPayroll.employeeName,
            payroll: updatedPayroll._id,
            amount: `${amount}`,
            account: organization.isAccrualAccounting
              ? payrollAccount._id
              : null,
            date: updatedPayroll.date,
          },
        },
        $inc: {
          totalExpense: Number(amount),
        },
      },
      { new: true, session }
    );
  }
};

const createPayroll = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const {
    employeeId,
    salary,
    type,
    startDate = new Date(),
    endDate = new Date(),
    notes,
    overtimePay,
    allowances,
    advance,
    loan,
    attendanceDeduction,
    totalPay,
    month = new Date(),
    company,
    organization,
    employeeName,
    numberOfMonths = 1,
    departmentPayroll,
    employeeGroupPayroll,
    timesheetPayroll,
    order,
    agent,
    costCenter,
  } = req.body;

  const dateUsingMonth = new Date(month);

  const currentMonth = monthNames[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;
  // const hasApproval = await ifHasApproval(
  //   type?.value === 'advance' ? 'advance' : 'payroll',
  //   organization
  // );

  const payroll = new Payroll({
    employeeId,
    employeeName,
    salary,
    overtimePay,
    type: type?.value,
    startDate,
    endDate,
    agent,
    notes,
    allowances,
    advance,
    loan,
    attendanceDeduction,
    totalPay,
    month: monthStart,
    numberOfMonths,
    company,
    organization,
    departmentPayroll,
    employeeGroupPayroll,
    timesheetPayroll,
    order,
    costCenter,
    approval: 'none',
  });
  const savedPayroll = await payroll.save();

  // if (hasApproval) {
  //   await findNextApprovalLevelAndNotify(
  //     'payroll',
  //     'pending',
  //     savedPayroll.organization,
  //     savedPayroll.company,
  //     savedPayroll.id,
  //     'Payroll',
  //     'payroll',
  //     savedPayroll._id
  //   );
  // } else {
  //   await approvePayroll(savedPayroll, session, res);
  // }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'payroll',
  //   actionId: `${savedPayroll.id}-${payrollListType[savedPayroll.type]}`,
  //   organization: savedPayroll.organization,
  //   company: savedPayroll.company,
  // });

  await session.commitTransaction();
  session.endSession();

  res.status(201).json({
    success: true,
    message: 'Payroll created successfully',
    data: savedPayroll,
  });
});

const createLoan = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  const {
    employeeId,
    salary,
    type,
    startDate = new Date(),
    endDate = new Date(),
    notes,
    month = new Date(),
    company,
    organization,
    employeeName,
    numberOfMonths = 1,
    loanInstallments = [],
    order,
  } = req.body;

  const dateUsingMonth = new Date(month);

  // Extract month and year from date as january-2024
  const currentMonth = monthNames[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  // const hasApproval = await ifHasApproval('loan', organization);

  const payroll = new Payroll({
    employeeId,
    employeeName,
    salary,
    type: type?.value,
    startDate,
    endDate,
    notes,
    month: monthStart,
    numberOfMonths,
    company,
    organization,
    order,
  });
  const savedPayroll = await payroll.save();

  // if (hasApproval) {
  //   await findNextApprovalLevelAndNotify(
  //     'payroll',
  //     'pending',
  //     savedPayroll.organization,
  //     savedPayroll.company,
  //     savedPayroll.id,
  //     'Loan',
  //     'employeeloan',
  //     savedPayroll._id
  //   );
  // } else {
  //   await approvePayroll(savedPayroll, session, res);
  // }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'payroll',
  //   actionId: `${savedPayroll.id}-Loan`,
  //   organization: savedPayroll.organization,
  //   company: savedPayroll.company,
  // });

  const installments = loanInstallments.map((installment, i) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return {
      ...installment,
      month: `${month}-${year}`,
      payrollId: savedPayroll._id,
      type: type?.value,
      createdAt: new Date(),
    };
  });

  await EmployeeLedger.findOneAndUpdate(
    {
      organization,
      employee: employeeId,
    },
    { $push: { ledger: { $each: installments } } },
    { upsert: true }
  );

  await session.commitTransaction();
  session.endSession();

  res.status(201).json({
    success: true,
    message: 'Payroll created successfully',
    data: savedPayroll,
  });
});

const updateloan = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    employeeId,
    salary,
    type,
    startDate = new Date(),
    endDate = new Date(),
    notes,
    month = new Date(),
    company,
    organization,
    employeeName,
    numberOfMonths = 1,
    loanInstallments = [],
  } = req.body;

  if (!salary) {
    throw new Error('Missing required fields');
  }

  const dateUsingMonth = new Date(month);
  const currentMonth = monthNames[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  const payroll = await Payroll.findById(id);

  if (!payroll) {
    throw new Error('Payroll not found');
  }

  const updatedPayroll = await Payroll.findByIdAndUpdate(req.params.payrollId, {
    employeeId,
    employeeName,
    salary,
    type: type?.value,
    startDate,
    endDate,
    notes,
    month: monthStart,
    numberOfMonths,
    company,
    organization,
  });

  if (!updatedPayroll) {
    throw new Error('Payroll not found');
  }

  // await findNextApprovalLevelAndNotify(
  //   'payroll',
  //   'pending',
  //   updatedPayroll.organization,
  //   updatedPayroll.company,
  //   updatedPayroll.id,
  //   'Payroll',
  //   'payroll',
  //   updatedPayroll._id
  // );

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'payroll',
  //   actionId: `${updatedPayroll.id}-Loan`,
  //   organization: updatedPayroll.organization,
  //   company: updatedPayroll.company,
  // });

  // // Create installment records
  const installments = loanInstallments.map((installment, i) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();

    return {
      ...installment,
      month: `${month}-${year}`,
      payrollId: updatedPayroll._id,
      type: type?.value,
      createdAt: new Date(),
    };
  });

  // Remove old installments and add new ones
  await EmployeeLedger.findOneAndUpdate(
    {
      organization,
      employee: employeeId,
    },
    {
      $pull: {
        ledger: { payrollId: updatedPayroll._id },
      },
    }
  );

  await EmployeeLedger.findOneAndUpdate(
    {
      organization,
      employee: employeeId,
    },
    {
      $push: {
        ledger: { $each: installments },
      },
    },
    { upsert: true }
  );

  res.status(200).json({
    success: true,
    message: 'Loan updated successfully',
    data: payroll,
  });
});

const multiplePayrollApprove = asyncHandler(async (req, res) => {
  const { selectedPayrolls, costCenter, salaryAccount } = req.body;
  const payrollIds = selectedPayrolls.map((payroll) => payroll._id);

  const updatedPayrolls = await Payroll.updateMany(
    { _id: { $in: payrollIds } },
    {
      $set: {
        approval: 'acknowledged',
        costCenter: costCenter || null,
        salaryAccount: salaryAccount || null,
      },
    }
  );

  if (!updatedPayrolls.matchedCount) {
    throw new Error('Payrolls not found');
  }

  res.status(200).json({
    success: true,
    message: 'Payrolls approved successfully',
    data: updatedPayrolls,
  });
});

const updatePayroll = asyncHandler(async (req, res) => {
  const { payrollId } = req.params;
  const {
    employeeId,
    salary,
    type,
    startDate,
    endDate,
    notes,
    overtimePay,
    allowances,
    advance,
    loan,
    attendanceDeduction,
    totalPay,
    month = new Date(),
    company,
    organization,
    employeeName,
    numberOfMonths,
  } = req.body;

  const dateUsingMonth = new Date(month);

  const currentMonth = monthNames[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  const updatedPayroll = await Payroll.findByIdAndUpdate(payrollId, {
    employeeId,
    employeeName,
    salary,
    overtimePay,
    allowances,
    advance,
    loan,
    attendanceDeduction,
    totalPay,
    numberOfMonths,
    type: type?.value,
    startDate,
    endDate,
    notes,
    month: monthStart,
    company,
    organization,
    fromGroupPayroll: false,
  });

  if (!updatedPayroll) {
    throw new Error('Payroll not found');
  }

  if (
    updatedPayroll.approval === 'approved1' ||
    updatedPayroll.approval === 'approved2' ||
    updatedPayroll.approval === 'none'
  ) {
    const amount =
      updatedPayroll.type === 'advance' || updatedPayroll.type === 'loan'
        ? updatedPayroll.salary
        : updatedPayroll.totalPay || updatedPayroll.salary;

    const salaryPayableAccount = await Account.findOneAndUpdate(
      {
        accountName: 'Salary Payable',
        organization: updatedPayroll.organization,
      },
      { $inc: { amount: -Number(amount) } },
      { new: true }
    );

    if (!salaryPayableAccount) {
      throw new Error('Salary Payable account not found');
    }

    const payrollAccountName =
      updatedPayroll.type === 'advance'
        ? 'Employee Advance'
        : updatedPayroll.type === 'loan'
          ? 'Employee Loan'
          : 'Salary and wages';

    const organization = await Organization.findById(
      updatedPayroll.organization
    ).select('isAccrualAccounting');

    let payrollAccount;

    if (organization.isAccrualAccounting) {
      payrollAccount = updatedPayroll.salaryAccount
        ? await Account.findById(updatedPayroll.salaryAccount)
        : await Account.findOne({
            accountName: payrollAccountName,
            organization: updatedPayroll.organization,
          });
      if (!payrollAccount) {
        throw new Error(`${payrollAccountName} account not found`);
      }
      payrollAccount.amount -= amount;
      await payrollAccount.save();
    }

    await Transaction.deleteMany({
      _id: { $in: updatedPayroll.transactions },
    });

    updatedPayroll.transactions = [];
    await updatedPayroll.save();

    if (updatedPayroll.costCenter && updatedPayroll.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        updatedPayroll.costCenter,
        {
          $push: {
            expense: {
              payroll: updatedPayroll._id,
            },
          },
          $inc: {
            totalExpense: Number(amount),
          },
        },
        { new: true }
      );
    }
  }
  // const hasApproval = await ifHasApproval(
  //   'payroll',
  //   updatedPayroll.organization
  // );

  // updatedPayroll.approval = hasApproval ? 'pending' : 'none';
  // await updatedPayroll.save();

  // if (!hasApproval) {
  //   await approvePayroll(updatedPayroll);
  // }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'payroll',
  //   actionId: `${updatedPayroll.id}-${payrollListType[updatedPayroll.type]}`,
  //   organization: updatedPayroll.organization,
  //   company: updatedPayroll.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Payroll updated successfully',
    data: updatedPayroll,
  });
});

const payrollapprove = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { user, approval } = req.body;
  const payroll = await Payroll.findById(req.params.id).session(session);

  if (!payroll) {
    await session.abortTransaction();
    session.endSession();
    throw new Error('Payroll not found');
  }

  // const oldApproval = payroll.approval;

  payroll.approval = approval;
  if (approval === 'approved1') {
    payroll.approvedBy1 = user || null;
    payroll.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    payroll.approvedBy2 = user || null;
    payroll.approvedAt2 = new Date();
  }

  const updatedPayroll = await payroll.save({ session });

  if (!updatedPayroll) {
    await session.abortTransaction();
    session.endSession();
    throw new Error('Payroll not found');
  }

  // if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
  //   await approvePayroll(updatedPayroll, session, res);

  //   if (approval === 'approved1') {
  //     await findNextApprovalLevelAndNotify(
  //       'payroll',
  //       approval,
  //       updatedPayroll.organization,
  //       updatedPayroll.company,
  //       updatedPayroll.id,
  //       'Payroll',
  //       'payroll',
  //       updatedPayroll._id
  //     );
  //   }
  // }

  await session.commitTransaction();
  session.endSession();

  res.status(200).json({
    success: true,
    message: 'Payroll approved successfully',
    data: payroll,
  });
});

const payrollrejected = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id);

  const { approvalComment } = req.body;

  if (!payroll) {
    throw new Error('Payroll not found');
  }

  if (payroll.approval === 'approved1' || payroll.approval === 'approved2') {
    const amount =
      payroll.type === 'advance' || payroll.type === 'loan'
        ? payroll.salary
        : payroll.totalPay || payroll.salary;

    await Account.findOneAndUpdate(
      {
        accountName: 'Salary Payable',
        organization: payroll.organization,
      },
      { $inc: { amount: -amount } },
      { new: true }
    );

    const payrollAccountName =
      payroll.type === 'advance'
        ? 'Employee Advance'
        : payroll.type === 'loan'
          ? 'Employee Loan'
          : 'Salary and wages';

    let payrollAccount;

    const organization = await Organization.findById(
      payroll.organization
    ).select('isAccrualAccounting');

    if (organization.isAccrualAccounting) {
      payrollAccount = payroll.salaryAccount
        ? await Account.findById(payroll.salaryAccount)
        : await Account.findOne({
            accountName: payrollAccountName,
            organization: payroll.organization,
          });
      payrollAccount.amount -= amount; // Revert addition
      await payrollAccount.save();
    }

    await Transaction.deleteMany({ _id: { $in: payroll.transactions } });

    if (payroll.costCenter && payroll.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        payroll.costCenter,
        {
          $pull: {
            expense: {
              payroll: payroll._id,
            },
          },
          $inc: {
            totalExpense: Number(-amount),
          },
        },
        { new: true }
      );
    }
  }
  payroll.transactions = [];
  payroll.approval = 'rejected';
  payroll.approvalComment = approvalComment || null;
  payroll.isRejected = true;
  payroll.verifiedBy = null;
  payroll.approvedBy1 = null;
  payroll.approvedBy2 = null;
  payroll.verifiedAt = null;
  payroll.approvedAt1 = null;
  payroll.approvedAt2 = null;
  payroll.reviewedBy = null;
  payroll.reviewedAt = null;
  payroll.acknowledgedBy = null;
  payroll.acknowledgedAt = null;
  await payroll.save();

  res.status(200).json({
    success: true,
    message: 'Payroll rejected successfully',
    data: payroll,
  });
});

const updateapproval = asyncHandler(async (req, res) => {
  const { id, userid } = req.params;
  const { approval, costCenter, salaryAccount, approvalComment } = req.body;

  const payroll = await Payroll.findById(id);

  if (!payroll) {
    throw new Error('Payroll not found');
  }

  const resetFields = () => {
    payroll.verifiedBy = null;
    payroll.approvedBy1 = null;
    payroll.approvedBy2 = null;
    payroll.verifiedAt = null;
    payroll.approvedAt1 = null;
    payroll.approvedAt2 = null;
    payroll.reviewedBy = null;
    payroll.reviewedAt = null;
    payroll.acknowledgedBy = null;
    payroll.acknowledgedAt = null;
  };

  payroll.approval = approval;
  if (approval === 'acknowledged') {
    payroll.acknowledgedBy = userid;
    payroll.acknowledgedAt = new Date();
    payroll.costCenter = costCenter || null;
    if (payroll.type !== 'advance' && payroll.type !== 'loan') {
      payroll.salaryAccount = salaryAccount || null;
    }
  } else if (approval === 'reviewed') {
    payroll.reviewedBy = userid;
    payroll.reviewedAt = new Date();
    payroll.verifiedBy = null;
    payroll.verifiedAt = null;
    payroll.acknowledgedBy = null;
    payroll.acknowledgedAt = null;
  } else if (approval === 'verified') {
    payroll.verifiedBy = userid;
    payroll.verifiedAt = new Date();
    payroll.acknowledgedBy = null;
    payroll.acknowledgedAt = null;
  } else if (approval === 'correction') {
    payroll.approvalComment = approvalComment || null;
    resetFields();
  }

  await payroll.save();

  res.status(200).json({
    success: true,
    message: 'Payroll updated successfully',
    data: payroll,
  });
});

const invalidatepayroll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payroll = await Payroll.findById(id);
  if (!payroll) {
    throw new Error('Payroll not found');
  }

  // const hasApproval = await ifHasApproval('payroll', payroll.organization);

  if (
    payroll.approval === 'approved1' ||
    payroll.approval === 'approved2' ||
    payroll.approval === 'none'
  ) {
    const amount =
      payroll.type === 'advance' || payroll.type === 'loan'
        ? payroll.salary
        : payroll.totalPay || payroll.salary;

    await Account.findOneAndUpdate(
      {
        accountName: 'Salary Payable',
        organization: payroll.organization,
      },
      { $inc: { amount: -amount } },
      { new: true }
    );

    const payrollAccountName =
      payroll.type === 'advance'
        ? 'Employee Advance'
        : payroll.type === 'loan'
          ? 'Employee Loan'
          : 'Salary and wages';

    let payrollAccount;

    const organization = await Organization.findById(
      payroll.organization
    ).select('isAccrualAccounting');

    if (organization.isAccrualAccounting) {
      payrollAccount = payroll.salaryAccount
        ? await Account.findById(payroll.salaryAccount)
        : await Account.findOne({
            accountName: payrollAccountName,
            organization: payroll.organization,
          });
      payrollAccount.amount -= amount; // Revert addition
      await payrollAccount.save();
    }

    // Delete all transactions stored in the payroll's transactions array
    await Transaction.deleteMany({ _id: { $in: payroll.transactions } });

    if (payroll.costCenter && payroll.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        payroll.costCenter,
        {
          $pull: {
            expense: {
              payroll: payroll._id,
            },
          },
          $inc: {
            totalExpense: Number(-amount),
          },
        },
        { new: true }
      );
    }
  }

  payroll.approval = 'rejected';

  payroll.isDeleted = true;
  payroll.verifiedBy = null;
  payroll.approvedBy1 = null;
  payroll.approvedBy2 = null;
  payroll.verifiedAt = null;
  payroll.approvedAt1 = null;
  payroll.approvedAt2 = null;
  payroll.reviewedBy = null;
  payroll.reviewedAt = null;
  payroll.acknowledgedBy = null;
  payroll.acknowledgedAt = null;
  await payroll.save();
  res.status(200).json({ message: 'Payroll invalidated' });

  res.status(200).json({
    success: true,
    message: 'Payroll invalidated successfully',
    data: payroll,
  });
});

const getpayrolls = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const payrolls = await Payroll.find({
    organization: orgid,
    isDeleted: false,
  }).populate('employeeId', ['firstName']);
  res.status(200).json({
    success: true,
    message: 'Payroll retrieved successfully',
    data: payrolls,
  });
});

const getpayrollById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payroll = await Payroll.findById(id).populate({
    path: 'employeeId',
    select: 'role ctc idNumber',
    populate: [
      { path: 'department', select: 'name' },
      { path: 'currProject', select: 'projectName' },
    ],
  });
  if (!payroll) {
    throw new NotFoundError('Payroll not found');
  }
  res.status(200).json({
    success: true,
    message: 'Payroll retrieved successfully',
    data: payroll,
  });
});

const getpayrollslipbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payroll = await Payroll.findById(id)
    .populate({
      path: 'employeeId',
      select: 'firstName lastName employeeId dateOfJoining role department ctc',
      populate: {
        path: 'department',
        select: 'name',
      },
    })
    // .populate("paidThrough", ["accountName"])
    .populate('agent', ['signature', 'role', 'fullName', 'userName'])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName'])
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
    ]);
  if (!payroll) {
    throw new NotFoundError('Payroll not found');
  }
  res.status(200).json({
    success: true,
    message: 'Payroll retrieved successfully',
    data: payroll,
  });
});

const getpayrollbyemployee = asyncHandler(async (req, res) => {
  const { empid } = req.params;

  const emppayrolls = await Payroll.find({
    employeeId: empid,
    isDeleted: false,
  }).sort({ startDate: -1 });
  if (!emppayrolls) {
    throw new NotFoundError('Payroll not found');
  }
  res.status(200).json({
    success: true,
    message: 'Payroll retrieved successfully',
    data: emppayrolls,
  });
});

const getpayrollbymonth = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const getpayrolls = await Payroll.find({
    organization: orgid,
    isDeleted: false,
    type: {
      $nin: ['advance', 'loan'],
    },
  })
    .select(
      'id month employeeName salary totalPay type startDate endDate voucherCreated notes approval organization'
    )
    .sort({ startDate: -1 });

  const payrolls = getpayrolls.reduce((acc, payroll) => {
    const { month } = payroll;
    const salary = payroll.totalPay || payroll.salary;
    const index = acc.findIndex((item) => item._id === month);
    if (index === -1) {
      acc.push({
        _id: month,
        totalSalary: salary,
        count: 1,
      });
    } else {
      acc[index].totalSalary += salary;
      acc[index].count += 1;
    }
    return acc;
  }, []);

  payrolls.sort((a, b) => {
    const getDate = (monthStr) => {
      const [month, year] = monthStr.split('-');
      return new Date(`${month} 1, ${year}`);
    };
    return getDate(b._id) - getDate(a._id);
  });

  if (!payrolls) {
    throw new NotFoundError('Payroll not found');
  }
  res.status(200).json({
    success: true,
    message: 'Payroll retrieved successfully',
    data: payrolls,
  });
});

const getadvanceloansbymonth = asyncHandler(async (req, res) => {
  const { orgid, type } = req.params;
  const getpayrolls = await Payroll.find({
    organization: orgid,
    isDeleted: false,
    type,
  })
    .select(
      'month employeeName salary type startDate endDate notes approval organization'
    )
    .sort({ startDate: -1 });

  const payrolls = getpayrolls.reduce((acc, payroll) => {
    const { month } = payroll;
    const { salary } = payroll;
    const index = acc.findIndex((item) => item._id === month);
    if (index === -1) {
      acc.push({
        _id: month,
        totalSalary: salary,
        count: 1,
      });
    } else {
      acc[index].totalSalary += salary;
      acc[index].count += 1;
    }
    return acc;
  }, []);
  res.status(200).json({
    success: true,
    message: 'Payroll retrieved successfully',
    data: payrolls,
  });
});

const getpayrollsbymonth = asyncHandler(async (req, res) => {
  const { month, orgid } = req.params;
  const { search_query, is_deleted } = req.query;

  const query = {
    month,
    isDeleted: is_deleted === 'true' ? true : false,
    organization: orgid,
    type: {
      $nin: ['advance', 'loan'],
    },
    ...(search_query &&
      search_query !== '' && {
        employeeName: { $regex: search_query, $options: 'i' },
      }),
  };

  const payrolls = await Payroll.find(query)
    .populate('employeeId', 'firstName lastName employeeId role')
    .select(
      'id employeeId employeeName approval salary type startDate endDate month notes createdAt numberOfMonths transactions costCenter isDeleted totalPay'
    )
    .sort({ startDate: -1 });
  res.status(200).json({
    success: true,
    message: 'Payroll retrieved successfully',
    data: payrolls,
  });
});

const getadvanceloansbymonthType = asyncHandler(async (req, res) => {
  const { month, orgid, type } = req.params;
  const { search_query, is_deleted } = req.query;

  const query = {
    month,
    isDeleted: is_deleted === 'true' ? true : false,
    organization: orgid,
    type,
    ...(search_query &&
      search_query !== '' && {
        employeeName: { $regex: search_query, $options: 'i' },
      }),
  };

  const payrolls = await Payroll.find(query)
    .populate('employeeId', 'firstName lastName employeeId role')
    .select(
      'employeeId employeeName approval salary type startDate endDate month notes createdAt numberOfMonths transactions costCenter'
    )
    .sort({ startDate: -1 });
  res.status(200).json({
    success: true,
    message: 'Payroll retrieved successfully',
    data: payrolls,
  });
});

const getworkinghoursbyattendanceandtimesheet = asyncHandler(
  async (req, res) => {
    const { empid } = req.params;
    const { from, to } = req.body;

    // creating a new object with date as key and value as 0
    const dateMap = {};
    for (
      let i = new Date(from);
      i <= new Date(to);
      i.setDate(i.getDate() + 1)
    ) {
      dateMap[i.toISOString().split('T')[0]] = 0;
    }

    const timesheetData = await EmployeeTimesheetRecord.find({
      employeeId: empid,
      startDate: {
        $gte: new Date(from),
      },
      endDate: {
        $lte: new Date(to),
      },
    });

    const dailyTimesheetData = timesheetData.filter(
      (item) => item.dailyTimesheetId
    );

    dailyTimesheetData.forEach((item) => {
      dateMap[item.startDate.toISOString().split('T')[0]] =
        item.regular + item.ot;
    });

    const userTimesheetData = timesheetData.filter(
      (item) => item.userTimesheetId
    );

    userTimesheetData.forEach((item) => {
      const date = item.startDate.toISOString().split('T')[0];
      if (
        dateMap[date] === undefined ||
        dateMap[date] < item.regular + item.ot
      ) {
        dateMap[date] = item.regular + item.ot;
      }
    });

    const attendance = await WebAttendance.find({
      employeeId: empid,
      date: {
        $gte: new Date(from),
        $lte: new Date(to),
      },
    });
    if (!attendance) {
      throw new Error('WebAttendance record not found');
    }

    attendance.forEach((a) => {
      let temp = 0;
      if (a.checkOut && a.checkIn) {
        const diff = a.checkOut.date - a.checkIn.date;
        temp += diff / 1000 / 60 / 60;
      }
      if (a.breakOut && a.breakOut.date && a.breakIn && a.breakIn.date) {
        const diff = a.breakOut.date - a.breakIn.date;
        temp -= diff / 1000 / 60 / 60;
      }
      const temp2 = dateMap[a.date.toISOString().split('T')[0]];

      if (temp > temp2) {
        dateMap[a.date.toISOString().split('T')[0]] = temp;
      }
    });

    let totalWorkingHours = 0;

    Object.keys(dateMap).forEach((key) => {
      totalWorkingHours += dateMap[key];
    });

    const monthlyTimesheet = timesheetData.filter((item) => item.timesheetId);

    const monthlyWorkingHours = monthlyTimesheet.reduce((acc, item) => {
      return acc + item.regular + item.ot;
    }, 0);

    if (monthlyWorkingHours > totalWorkingHours) {
      totalWorkingHours = monthlyWorkingHours;
    }
    res.status(200).json({
      success: true,
      message: 'monthlyWorkingHours retrieved successfully',
      data: monthlyWorkingHours,
    });
  }
);

const getemployeeledgerbypayroll = asyncHandler(async (req, res) => {
  const { payrollid } = req.params;

  // Get payroll and employee ledger in parallel
  const [payroll, employeeLedger] = await Promise.all([
    Payroll.findById(payrollid),
    EmployeeLedger.findOne({
      'ledger.payrollId': payrollid,
      'ledger.type': 'loan',
    }).select('ledger'),
  ]);

  if (!payroll) {
    throw new Error('Payroll not found');
  }

  if (!employeeLedger) {
    throw new Error('Employee ledger not found');
  }

  const ledger = employeeLedger.ledger.filter(
    (item) => item.payrollId?.toString() === payrollid
  );

  res.status(200).json({
    success: true,
    message: 'Employee Ledger retrieved successfully',
    data: ledger,
  });
});

const getemployeeledgerbymonth = asyncHandler(async (req, res) => {
  const { empid, month } = req.params;
  const employeeLedger = await EmployeeLedger.findOne({
    employee: empid,
  });

  if (!employeeLedger) {
    throw new Error('Employee Ledger not found');
  }

  const ledger = employeeLedger?.ledger?.filter((item) => item.month === month);
  res.status(200).json({
    success: true,
    message: 'Employee Ledger retrieved successfully',
    data: ledger,
  });
});

const getbulkemployeeledgerbymonth = asyncHandler(async (req, res) => {
  const { empids, month } = req.body;

  if (!empids || !Array.isArray(empids) || empids.length === 0) {
    throw new Error('Employee IDs array is required and must not be empty');
  }

  if (!month) {
    throw new Error('Month is required');
  }

  const employeeLedgers = await EmployeeLedger.find({
    employee: { $in: empids },
  });

  if (!employeeLedgers || employeeLedgers.length === 0) {
    throw new Error('Employee Ledger not found');
  }

  const result = employeeLedgers.reduce((acc, ledger) => {
    const filteredLedger = ledger.ledger.filter((item) => item.month === month);

    const totals = filteredLedger.reduce(
      (sums, item) => {
        if (item.type === 'advance') sums.advance += Number(item.amount);
        if (item.type === 'loan') sums.loan += Number(item.amount);
        return sums;
      },
      { advance: 0, loan: 0 }
    );

    acc[ledger.employee] = {
      ...totals,
    };
    return acc;
  }, {});
  res.status(200).json({
    success: true,
    message: 'employeeLedgers retrieved successfully',
    data: result,
  });
});

const deletePayroll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payroll = await Payroll.findByIdAndDelete(id);
  if (!payroll) {
    throw new NotFoundError('Payroll not found');
  }

  res.status(200).json({
    success: true,
    message: 'Payroll deleted successfully',
    data: payroll,
  });
});

module.exports = {
  approvePayroll,
  createLoan,
  createPayroll,
  updateloan,
  deletePayroll,
  multiplePayrollApprove,
  updatePayroll,
  getpayrollsbymonth,
  payrollapprove,
  payrollrejected,
  updateapproval,
  invalidatepayroll,
  getpayrolls,
  getpayrollById,
  getpayrollslipbyid,
  getadvanceloansbymonthType,
  getadvanceloansbymonth,
  getworkinghoursbyattendanceandtimesheet,
  getemployeeledgerbypayroll,
  getbulkemployeeledgerbymonth,
  getpayrollbyemployee,
  getpayrollbymonth,
  getemployeeledgerbymonth,
};
