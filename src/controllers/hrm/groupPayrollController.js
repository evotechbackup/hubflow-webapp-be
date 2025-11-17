const mongoose = require('mongoose');
const Payroll = require('../../models/hrm/Payroll');
const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
const CostCenter = require('../../models/accounts/CostCenter');
const { createActivityLog } = require('../../utils/logUtils');
const GroupPayroll = require('../../models/hrm/GroupPayroll');
const EmployeeTimesheetRecord = require('../../models/hrm/EmployeeTimesheetRecord');
const WebAttendance = require('../../models/hrm/WebAttendance');
const {
  ifHasApproval,
  findNextApprovalLevelAndNotify,
} = require('../../utils/approvalUtils');
const Organization = require('../../models/auth/Organization');
const { MONTH_NAMES } = require('../../utils/constants');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError, ServerError } = require('../../utils/errors');

const payrollListType = {
  full: 'Salary-Payment',
  advance: 'Advance-Payment',
  timesheet: 'Attendance-Timesheet-Payment',
};

const approveGroupPayroll = async (
  employeeGroupPayroll,
  approval,
  session,
  req
) => {
  const totalPay = employeeGroupPayroll.recordedTime.reduce((acc, item) => {
    return acc + item.salary;
  }, 0);

  const salaryPayableAccount = await Account.findOneAndUpdate(
    {
      accountName: 'Salary Payable',
      organization: employeeGroupPayroll.organization,
    },
    { $inc: { amount: totalPay } },
    { session }
  );

  if (!salaryPayableAccount) {
    console.log('Salary Payable account not found');
    return;
  }

  const organization = await Organization.findById(
    employeeGroupPayroll.organization
  ).select('isAccrualAccounting');

  let salaryPayableRunningBalance = salaryPayableAccount.amount;

  // Iterate through all payrolls and process them
  const payrollPromises = employeeGroupPayroll.payrollList.map(
    async (payrollId) => {
      const payroll = await Payroll.findById(payrollId).session(session);

      if (!payroll) {
        console.log(`Payroll with ID ${payrollId} not found`);
        return;
      }

      if (
        payroll.approval === 'approved1' ||
        payroll.approval === 'approved2'
      ) {
        if (payroll.approval === 'approved1' && approval === 'approved2') {
          payroll.approvedBy2 = req.id;
          payroll.approvedAt2 = new Date();
          await payroll.save({ session });
        }
        console.log(`Payroll with ID ${payrollId} already approved`);
        return;
      }

      payroll.approval = approval;
      if (approval === 'approved1') {
        payroll.approvedBy1 = req.id;
        payroll.approvedAt1 = new Date();
      } else if (approval === 'approved2') {
        payroll.approvedBy2 = req.id;
        payroll.approvedAt2 = new Date();
      }

      const amount = payroll.salary;

      // Update payroll account (Salary or Advance)
      const payrollAccountName = 'Salary and wages';

      let payrollAccount;

      if (organization.isAccrualAccounting) {
        payrollAccount =
          payroll.salaryAccount || employeeGroupPayroll.salaryAccount
            ? await Account.findById(
                payroll.salaryAccount || employeeGroupPayroll.salaryAccount
              ).session(session)
            : await Account.findOne({
                accountName: payrollAccountName,
                organization: payroll.organization,
              }).session(session);

        if (!payrollAccount) {
          console.log(`${payrollAccountName} account not found`);
          return;
        }

        payrollAccount.amount += amount;
        await payrollAccount.save({ session });

        // Create a transaction for the payroll account
        const payrollAccountTransaction = new Transaction({
          reference: `${employeeGroupPayroll.id}-Salary-Payment`,
          account: payrollAccount._id,
          id: `${payroll.employeeName}`,
          type: 'payroll',
          debit: amount,
          runningBalance: payrollAccount?.amount,
          organization: payroll.organization,
          company: payroll.company,
        });
        await payrollAccountTransaction.save({ session });

        payroll.transactions.push(payrollAccountTransaction._id);
      }

      await payroll.save({ session });

      let transactionId = '';

      if (payroll?.employeeName) {
        transactionId = `${payroll?.employeeName}-${
          payrollListType[payroll?.type]
        }`;
      }

      // DD-MM-YYYY of createdAt
      const createdAt = new Date(payroll.createdAt);
      transactionId = `${transactionId}-${createdAt.getDate()}-${
        createdAt.getMonth() + 1
      }-${createdAt.getFullYear()}`;

      await Transaction.create({
        reference: transactionId,
        account: salaryPayableAccount._id,
        id: `${payroll.employeeName}`,
        type: 'payroll',
        credit: amount,
        runningBalance: salaryPayableRunningBalance + Number(amount),
        organization: payroll.organization,
        company: payroll.company,
      });

      salaryPayableRunningBalance += Number(amount);

      // Update cost center if provided
      if (payroll.costCenter && payroll.costCenter !== '') {
        await CostCenter.findByIdAndUpdate(
          payroll.costCenter,
          {
            $push: {
              expense: {
                payrollId: payroll.employeeName,
                payroll: payroll._id,
                amount,
                account: organization.isAccrualAccounting
                  ? payrollAccount._id
                  : null,
                date: payroll.date,
              },
            },
            $inc: { totalExpense: Number(amount) },
          },
          { new: true, session }
        );
      }
    }
  );

  // Wait for all payrolls to be processed
  await Promise.all(payrollPromises);

  // Update employee group payroll approval status
  await GroupPayroll.findByIdAndUpdate(
    employeeGroupPayroll._id,
    { $set: { approvalStatus: 'accepted', approval } },
    { new: true, session }
  );
};

const createGroupPayroll = asyncHandler(async (req, res) => {
  const {
    title,
    employeeGroupId,
    division,
    departmentId,
    role,
    projectId,
    jobSiteId,
    recordedTime,
    startDate,
    endDate,
    type,
    month = new Date(),
    notes,
    company,
    organization,
    allowanceColumns,
    costCenter,
  } = req.body;

  const dateUsingMonth = new Date(month);
  const currentMonth = MONTH_NAMES[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  const groupPayroll = new GroupPayroll({
    title,
    employeeGroupId,
    division,
    departmentId,
    role,
    projectId,
    jobSiteId,
    user: req.id,
    recordedTime,
    startDate,
    endDate,
    type,
    month: monthStart,
    notes,
    company,
    organization,
    allowanceColumns,
    costCenter,
  });
  await groupPayroll.save();

  const payrollList = [];

  const notificationPromises = recordedTime.map(async (item) => {
    const payroll = new Payroll({
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      salary: item.regular,
      totalPay: item.salary,
      allowances: item.allowances || [],
      allowance: item.allowance,
      deduction: item.deduction,
      advance: item.advance || 0,
      loan: item.loan || 0,
      attendanceDeduction: item.attendanceDeduction || 0,
      overtimePay: item.overtimePay || 0,
      type,
      startDate,
      endDate,
      paidThrough: null,
      notes: '',
      month: monthStart,
      company,
      organization,
      fromGroupPayroll: true,
      costCenter,
      user: req.id,
    });
    const savedPayroll = await payroll.save();

    payrollList.push(savedPayroll._id);
  });

  await Promise.all(notificationPromises);

  const hasApproval = await ifHasApproval('payroll', organization);

  await GroupPayroll.findByIdAndUpdate(
    groupPayroll._id,
    { $set: { payrollList, approval: hasApproval ? 'pending' : 'none' } },
    { new: true }
  );

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'payroll',
      'pending',
      organization,
      company,
      groupPayroll.id,
      'Payroll',
      'payroll',
      groupPayroll._id
    );
  } else {
    await approveGroupPayroll(groupPayroll, 'pending', null, req);
  }

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'groupPayroll',
    actionId: groupPayroll.month,
    organization,
    company,
  });

  res.status(200).json({
    success: true,
    message: 'Group payroll created successfully',
    data: groupPayroll,
  });
});

const updateGroupPayroll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    recordedTime,
    startDate,
    endDate,
    type,
    month = new Date(),
    notes,
    costCenter,
  } = req.body;

  const dateUsingMonth = new Date(month);
  const currentMonth = MONTH_NAMES[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  const groupPayroll = await GroupPayroll.findByIdAndUpdate(id, {
    title,
    recordedTime,
    startDate,
    endDate,
    type,
    month: monthStart,
    notes,
    costCenter,
  });

  if (
    groupPayroll.approval === 'approved1' ||
    groupPayroll.approval === 'approved2' ||
    groupPayroll.approval === 'none'
  ) {
    const totalPay = groupPayroll.recordedTime.reduce((acc, item) => {
      return acc + item.salary;
    }, 0);

    const salaryPayableAccount = await Account.findOneAndUpdate(
      {
        accountName: 'Salary Payable',
        organization: groupPayroll.organization,
      },
      { $inc: { amount: -totalPay } },
      { new: true }
    );

    if (!salaryPayableAccount) {
      throw new NotFoundError('Salary Payable account not found');
    }

    const organization = await Organization.findById(
      groupPayroll.organization
    ).select('isAccrualAccounting');

    // Iterate through all payrolls and process them
    const payrollPromises = groupPayroll.payrollList.map(async (payrollId) => {
      const payroll = await Payroll.findById(payrollId);

      if (!payroll) {
        console.log(`Payroll with ID ${payrollId} not found`);
        return;
      }

      if (
        payroll.approval !== 'approved1' &&
        payroll.approval !== 'approved2' &&
        payroll.approval !== 'none'
      ) {
        return;
      }

      const amount = payroll.salary;

      // Update payroll account (Salary or Advance)
      const payrollAccountName = 'Salary and wages';

      let payrollAccount;

      if (organization.isAccrualAccounting) {
        payrollAccount =
          payroll.salaryAccount || groupPayroll.salaryAccount
            ? await Account.findById(
                payroll.salaryAccount || groupPayroll.salaryAccount
              )
            : await Account.findOne({
                accountName: payrollAccountName,
                organization: payroll.organization,
              });

        if (!payrollAccount) {
          console.log(`${payrollAccountName} account not found`);
          return;
        }

        payrollAccount.amount -= amount;
        await payrollAccount.save();
      }

      // Create a transaction for the payroll account
      await Transaction.deleteMany({ _id: { $in: payroll.transactions } });

      payroll.transactions = [];
      payroll.approval = 'pending';

      await payroll.save();

      // Update cost center if provided
      if (payroll.costCenter && payroll.costCenter !== '') {
        await CostCenter.findByIdAndUpdate(
          payroll.costCenter,
          {
            $pull: {
              expense: {
                payroll: payroll._id,
              },
            },
            $inc: { totalExpense: Number(-amount) },
          },
          { new: true }
        );
      }
    });

    // Wait for all payrolls to be processed
    await Promise.all(payrollPromises);
  }

  const notificationPromises = recordedTime.map(async (item, index) => {
    await Payroll.findByIdAndUpdate(groupPayroll.payrollList[index], {
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      salary: item.regular,
      totalPay: item.salary,
      allowances: item.allowances || [],
      allowance: item.allowance,
      deduction: item.deduction,
      advance: item.advance || 0,
      loan: item.loan || 0,
      attendanceDeduction: item.attendanceDeduction || 0,
      overtimePay: item.overtimePay || 0,
      type,
      startDate,
      endDate,
      paidThrough: null,
      notes: '',
      month: monthStart,
    });
  });

  await Promise.all(notificationPromises);

  const hasApproval = await ifHasApproval('payroll', groupPayroll.organization);

  if (!hasApproval) {
    await approveGroupPayroll(groupPayroll, 'none', null, req);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'groupPayroll',
    actionId: groupPayroll.month,
    organization: groupPayroll.organization,
    company: groupPayroll.company,
  });

  res.status(200).json({
    success: true,
    message: 'Group payroll updated successfully',
    data: groupPayroll,
  });
});

const approveGroupPayrollStatus = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { approval } = req.body;

    // Fetch payroll list for the given employee group payroll ID
    const employeeGroupPayroll = await GroupPayroll.findById(id)
      .select('payrollList approval costCenter salaryAccount')
      .session(session);
    if (!employeeGroupPayroll) {
      throw new NotFoundError('Employee group payroll not found');
    }

    const oldApproval = employeeGroupPayroll.approval;

    if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
      await approveGroupPayroll(employeeGroupPayroll, approval, session, req);

      if (approval === 'approved1') {
        await findNextApprovalLevelAndNotify(
          'payroll',
          approval,
          employeeGroupPayroll.organization,
          employeeGroupPayroll.company,
          employeeGroupPayroll.id,
          'Payroll',
          'payroll',
          employeeGroupPayroll._id
        );
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: 'Payrolls approved successfully',
      data: { message: 'Payrolls approved successfully' },
    });
  } catch (error) {
    // Abort the transaction on error
    await session.abortTransaction();
    throw new ServerError(error.message);
  } finally {
    session.endSession();
  }
});

const rejectGroupPayroll = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const { approvalComment } = req.body;

    // Fetch payroll list for the given employee group payroll ID
    const employeeGroupPayroll = await GroupPayroll.findById(id)
      .select('payrollList')
      .session(session);
    if (!employeeGroupPayroll) {
      throw new NotFoundError('Employee group payroll not found');
    }

    const oldApproval = employeeGroupPayroll.approval;

    if (oldApproval === 'approved1' || oldApproval === 'approved2') {
      const totalPay = employeeGroupPayroll.recordedTime.reduce((acc, item) => {
        return acc + item.salary;
      }, 0);

      const salaryPayableAccount = await Account.findOneAndUpdate(
        {
          accountName: 'Salary Payable',
          organization: employeeGroupPayroll.organization,
        },
        { $inc: { amount: -totalPay } },
        { new: true, session }
      );

      if (!salaryPayableAccount) {
        throw new NotFoundError('Salary Payable account not found');
      }

      const organization = await Organization.findById(
        employeeGroupPayroll.organization
      ).select('isAccrualAccounting');

      // Iterate through all payrolls and process them
      const payrollPromises = employeeGroupPayroll.payrollList.map(
        async (payrollId) => {
          const payroll = await Payroll.findById(payrollId).session(session);

          if (!payroll) {
            console.log(`Payroll with ID ${payrollId} not found`);
            return;
          }

          if (
            payroll.approval !== 'approved1' &&
            payroll.approval !== 'approved2'
          ) {
            return;
          }

          const amount = payroll.salary;

          // Update payroll account (Salary or Advance)
          const payrollAccountName = 'Salary and wages';

          let payrollAccount;
          if (organization.isAccrualAccounting) {
            payrollAccount =
              payroll.salaryAccount || employeeGroupPayroll.salaryAccount
                ? await Account.findById(
                    payroll.salaryAccount || employeeGroupPayroll.salaryAccount
                  ).session(session)
                : await Account.findOne({
                    accountName: payrollAccountName,
                    organization: payroll.organization,
                  }).session(session);

            if (!payrollAccount) {
              console.log(`${payrollAccountName} account not found`);
              return;
            }

            payrollAccount.amount -= amount;
            await payrollAccount.save({ session });
          }

          // Create a transaction for the payroll account
          await Transaction.deleteMany({ _id: { $in: payroll.transactions } });

          payroll.transactions = [];
          payroll.approval = 'rejected';
          payroll.approvalComment = approvalComment || '';
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

          await payroll.save({ session });

          // Update cost center if provided
          if (payroll.costCenter && payroll.costCenter !== '') {
            await CostCenter.findByIdAndUpdate(
              payroll.costCenter,
              {
                $pull: {
                  expense: {
                    payroll: payroll._id,
                  },
                },
                $inc: { totalExpense: Number(-amount) },
              },
              { new: true, session }
            );
          }
        }
      );

      // Wait for all payrolls to be processed
      await Promise.all(payrollPromises);
    }

    employeeGroupPayroll.approval = 'rejected';
    employeeGroupPayroll.approvalComment = approvalComment || null;
    employeeGroupPayroll.isRejected = true;
    employeeGroupPayroll.verifiedBy = null;
    employeeGroupPayroll.approvedBy1 = null;
    employeeGroupPayroll.approvedBy2 = null;
    employeeGroupPayroll.verifiedAt = null;
    employeeGroupPayroll.approvedAt1 = null;
    employeeGroupPayroll.approvedAt2 = null;
    employeeGroupPayroll.reviewedBy = null;
    employeeGroupPayroll.reviewedAt = null;
    employeeGroupPayroll.acknowledgedBy = null;
    employeeGroupPayroll.acknowledgedAt = null;
    await employeeGroupPayroll.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: 'Payrolls rejected successfully',
      data: { message: 'Payrolls rejected successfully' },
    });
  } catch (error) {
    // Abort the transaction on error
    await session.abortTransaction();
    console.error(error);
    throw new ServerError(error.message);
  } finally {
    session.endSession();
  }
});

const updateGroupPayrollApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, costCenter, salaryAccount, approvalComment } = req.body;

  const groupPayroll = await GroupPayroll.findById(id);

  if (!groupPayroll) {
    throw new NotFoundError('Group payroll not found');
  }

  const payrollPromises = groupPayroll.payrollList.map(async (payrollId) => {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return;
    }

    if (payroll.approval === 'approved1' || payroll.approval === 'approved2') {
      return;
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

    if (approval === 'acknowledged') {
      payroll.costCenter = costCenter || null;
      payroll.salaryAccount = salaryAccount || null;
      payroll.acknowledgedBy = req.id;
      payroll.acknowledgedAt = new Date();
    } else if (approval === 'reviewed') {
      payroll.reviewedBy = req.id;
      payroll.reviewedAt = new Date();
      payroll.verifiedBy = null;
      payroll.verifiedAt = null;
      payroll.acknowledgedBy = null;
      payroll.acknowledgedAt = null;
    } else if (approval === 'verified') {
      payroll.verifiedBy = req.id;
      payroll.verifiedAt = new Date();
      payroll.acknowledgedBy = null;
      payroll.acknowledgedAt = null;
    } else if (approval === 'correction') {
      payroll.approvalComment = approvalComment || null;
      resetFields();
    }

    await payroll.save();
  });

  await Promise.all(payrollPromises);

  groupPayroll.approval = approval;
  if (approval === 'acknowledged') {
    groupPayroll.costCenter = costCenter || null;
    groupPayroll.salaryAccount = salaryAccount || null;
  }
  if (approval === 'correction') {
    groupPayroll.approvalComment = approvalComment || null;
  }

  await groupPayroll.save();

  await findNextApprovalLevelAndNotify(
    'payroll',
    approval,
    groupPayroll.organization,
    groupPayroll.company,
    groupPayroll.id,
    'Payroll',
    'payroll',
    groupPayroll._id
  );

  res.status(200).json({
    success: true,
    message: 'Group payroll updated successfully',
    data: groupPayroll,
  });
});

const invalidateGroupPayroll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const groupPayroll = await GroupPayroll.findById(id);
  if (!groupPayroll) {
    throw new NotFoundError('Group payroll not found');
  }
  groupPayroll.isDeleted = true;
  groupPayroll.verifiedBy = null;
  groupPayroll.approvedBy1 = null;
  groupPayroll.approvedBy2 = null;
  groupPayroll.verifiedAt = null;
  groupPayroll.approvedAt1 = null;
  groupPayroll.approvedAt2 = null;
  groupPayroll.reviewedBy = null;
  groupPayroll.reviewedAt = null;
  groupPayroll.acknowledgedBy = null;
  groupPayroll.acknowledgedAt = null;
  await groupPayroll.save();

  if (
    groupPayroll === 'approved1' ||
    groupPayroll === 'approved2' ||
    groupPayroll === 'none'
  ) {
    const totalPay = groupPayroll.recordedTime.reduce((acc, item) => {
      return acc + item.salary;
    }, 0);

    const salaryPayableAccount = await Account.findOneAndUpdate(
      {
        accountName: 'Salary Payable',
        organization: groupPayroll.organization,
      },
      { $inc: { amount: -totalPay } },
      { new: true }
    );

    if (!salaryPayableAccount) {
      throw new NotFoundError('Salary Payable account not found');
    }

    const organization = await Organization.findById(
      groupPayroll.organization
    ).select('isAccrualAccounting');

    // Iterate through all payrolls and process them
    const payrollPromises = groupPayroll.payrollList.map(async (payrollId) => {
      const payroll = await Payroll.findById(payrollId);

      if (!payroll) {
        console.log(`Payroll with ID ${payrollId} not found`);
        return;
      }

      if (
        payroll.approval !== 'approved1' &&
        payroll.approval !== 'approved2' &&
        payroll.approval !== 'none'
      ) {
        return;
      }

      const amount = payroll.salary;

      // Update payroll account (Salary or Advance)
      const payrollAccountName = 'Salary and wages';

      let payrollAccount;
      if (organization.isAccrualAccounting) {
        payrollAccount =
          payroll.salaryAccount || groupPayroll.salaryAccount
            ? await Account.findById(
                payroll.salaryAccount || groupPayroll.salaryAccount
              )
            : await Account.findOne({
                accountName: payrollAccountName,
                organization: payroll.organization,
              });

        if (!payrollAccount) {
          console.log(`${payrollAccountName} account not found`);
          return;
        }

        payrollAccount.amount -= amount;
        await payrollAccount.save();
      }

      // Create a transaction for the payroll account
      await Transaction.deleteMany({ _id: { $in: payroll.transactions } });

      payroll.transactions = [];
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

      // Update cost center if provided
      if (payroll.costCenter && payroll.costCenter !== '') {
        await CostCenter.findByIdAndUpdate(
          payroll.costCenter,
          {
            $pull: {
              expense: {
                payroll: payroll._id,
              },
            },
            $inc: { totalExpense: Number(-amount) },
          },
          { new: true }
        );
      }
    });

    // Wait for all payrolls to be processed
    await Promise.all(payrollPromises);
  }

  const payrollPromises = groupPayroll.payrollList.map(async (payrollId) => {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return;
    }
    if (payroll.approval === 'approved1' || payroll.approval === 'approved2') {
      return;
    }
    payroll.isDeleted = true;
    await payroll.save();
  });

  await Promise.all(payrollPromises);

  res.status(200).json({
    success: true,
    message: 'Group payroll invalidated',
    data: { message: 'Group payroll invalidated' },
  });
});

const getGroupPayrollsByOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const groups = await GroupPayroll.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: '$month',
        count: { $sum: 1 },
      },
    },
    {
      $addFields: {
        sortDate: {
          $dateFromString: {
            dateString: {
              $concat: [
                '01-',
                { $substr: ['$_id', 0, { $indexOfBytes: ['$_id', '-'] }] },
                '-',
                {
                  $substr: [
                    '$_id',
                    { $add: [{ $indexOfBytes: ['$_id', '-'] }, 1] },
                    4,
                  ],
                },
              ],
            },
            format: '%d-%B-%Y',
          },
        },
      },
    },
    {
      $sort: {
        sortDate: -1,
      },
    },
    {
      $project: {
        _id: 1,
        count: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Group payrolls fetched successfully',
    data: groups,
  });
});

const getGroupPayrollsByMonth = asyncHandler(async (req, res) => {
  const { orgid, month } = req.params;
  const groupPayrolls = await GroupPayroll.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        month,
        isDeleted: false,
      },
    },
    {
      $project: {
        totalPay: '$recordedTime.salary',
        month: 1,
        startDate: 1,
        endDate: 1,
        createdAt: 1,
        approvalStatus: 1,
        id: 1,
        title: 1,
        approval: 1,
        voucherCreated: 1,
      },
    },
    {
      $group: {
        _id: '$_id',
        totalPay: { $sum: { $sum: '$totalPay' } },
        month: { $first: '$month' },
        startDate: { $first: '$startDate' },
        endDate: { $first: '$endDate' },
        createdAt: { $first: '$createdAt' },
        approvalStatus: { $first: '$approvalStatus' },
        approval: { $first: '$approval' },
        id: { $first: '$id' },
        title: { $first: '$title' },
        voucherCreated: { $first: '$voucherCreated' },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Group payrolls fetched successfully',
    data: groupPayrolls,
  });
});

const getGroupPayrollById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const groupPayroll = await GroupPayroll.findById(id)
    .populate('employeeGroupId', 'name')
    .populate('departmentId', 'name')
    .populate('user', ['signature', 'userName', 'role', 'fullName'])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy', ['signature', 'userName', 'role', 'fullName'])
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
    ])
    .populate('recordedTime.employeeId', [
      'firstName',
      'lastName',
      'hourlyPay',
      'employeeId',
    ]);

  if (!groupPayroll) {
    throw new NotFoundError('Group payroll not found');
  }

  const totalPay = groupPayroll.recordedTime.reduce((acc, item) => {
    return acc + (Number(item.salary) || 0);
  }, 0);

  // Convert to plain object to avoid mongoose document issues
  const payrollObject = groupPayroll.toObject();

  res.status(200).json({
    success: true,
    message: 'Group payroll fetched successfully',
    data: { ...payrollObject, totalPay },
  });
});

const getWorkingHoursByAttendanceAndTimesheet = asyncHandler(
  async (req, res) => {
    const { from, to, employeeIds } = req.body;

    // If employeeIds is provided, use it instead of single empid
    const targetEmployeeIds = employeeIds;

    const results = await Promise.all(
      targetEmployeeIds.map(async (employeeId) => {
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
          employeeId,
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

        const attendance = await WebAttendance.find({
          employeeId,
          date: {
            $gte: new Date(from),
            $lte: new Date(to),
          },
        });

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

        const monthlyTimesheet = timesheetData.filter(
          (item) => item.timesheetId
        );

        const monthlyWorkingHours = monthlyTimesheet.reduce((acc, item) => {
          return acc + item.regular + item.ot;
        }, 0);

        if (monthlyWorkingHours > totalWorkingHours) {
          totalWorkingHours = monthlyWorkingHours;
        }

        return {
          employeeId,
          totalWorkingHours,
        };
      })
    );

    const resultObject = results.reduce((acc, curr) => {
      acc[curr.employeeId] = curr.totalWorkingHours;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      message: 'Working hours fetched successfully',
      data: resultObject,
    });
  }
);

module.exports = {
  createGroupPayroll,
  updateGroupPayroll,
  approveGroupPayrollStatus,
  rejectGroupPayroll,
  updateGroupPayrollApproval,
  invalidateGroupPayroll,
  getGroupPayrollsByOrganization,
  getGroupPayrollsByMonth,
  getGroupPayrollById,
  getWorkingHoursByAttendanceAndTimesheet,
};
