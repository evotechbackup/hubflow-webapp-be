const Payroll = require('../../models/hrm/Payroll');
const Account = require('../../models/accounts/Account');
const Transaction = require('../../models/accounts/Transaction');
const Employee = require('../../models/hrm/Employee');
const EmployeeLedger = require('../../models/accounts/EmployeeLedger');
const { default: mongoose } = require('mongoose');
const PayrollVoucher = require('../../models/hrm/PayrollVoucher');
const LastInsertedId = require('../../models/master/LastInsertedID');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../utils/approvalUtils');
const { createActivityLog } = require('../../utils/logUtils');
const GroupPayroll = require('../../models/hrm/GroupPayroll');
const Organization = require('../../models/auth/Organization');
const { PAYROLL_LIST_TYPES, MONTH_NAMES } = require('../../utils/constants');
const { NotFoundError, ServerError } = require('../../utils/errors');
const { asyncHandler } = require('../../middleware/errorHandler');

const approvePayrollVoucher = async (payrollVoucher, session, res) => {
  const salaryPayableAccount = await Account.findOne({
    accountName: 'Salary Payable',
    organization: payrollVoucher.organization,
  }).session(session);

  if (!salaryPayableAccount) {
    await session.abortTransaction();
    session.endSession();
    throw new NotFoundError('Salary Payable account not found');
  }

  const paidThroughAccount = await Account.findById(
    payrollVoucher.paidThrough
  ).session(session);

  if (!paidThroughAccount) {
    await session.abortTransaction();
    session.endSession();
    throw new NotFoundError('Paid through account not found');
  }

  const payrollAccountName =
    payrollVoucher.type === 'advance'
      ? 'Employee Advance'
      : payrollVoucher.type === 'loan'
        ? 'Employee Loan'
        : 'Salary and wages';

  const organization = await Organization.findById(
    payrollVoucher.organization
  ).select('isAccrualAccounting');

  let salaryAccount;
  if (!organization.isAccrualAccounting) {
    salaryAccount = payrollVoucher.salaryAccount
      ? await Account.findById(payrollVoucher.salaryAccount).session(session)
      : await Account.findOne({
          accountName: payrollAccountName,
          organization: payrollVoucher.organization,
        }).session(session);
  }

  let totalSalaryAmount = 0;
  const transactionList = [];

  if (payrollVoucher.employeeIds?.length > 0) {
    if (payrollVoucher.type === 'full') {
      for (const employee of payrollVoucher.employeeIds) {
        const payroll = await Payroll.findById(employee.payrollId).session(
          session
        );
        const amount = employee?.totalPay || employee.salary;

        totalSalaryAmount += amount;

        let transactionId = '';
        if (payroll?.employeeName) {
          transactionId = `${payroll?.employeeName}-${
            PAYROLL_LIST_TYPES[payroll?.type]
          }`;
        }

        // DD-MM-YYYY of createdAt
        const createdAt = new Date(payroll.createdAt);
        transactionId = `${transactionId}-${createdAt.getDate()}-${
          createdAt.getMonth() + 1
        }-${createdAt.getFullYear()}`;

        transactionId += ` ${payrollVoucher.id}`;

        const transaction = new Transaction({
          reference: transactionId,
          account: salaryPayableAccount._id,
          id: payroll?.employeeName || '',
          type: 'payrollvoucher',
          debit: amount,
          runningBalance:
            salaryPayableAccount.amount - Number(totalSalaryAmount),
          organization: payrollVoucher.organization,
          company: payrollVoucher.company,
        });
        await transaction.save({ session });

        const transaction2 = new Transaction({
          account: paidThroughAccount._id,
          reference: `${payroll?.employeeName}-${
            PAYROLL_LIST_TYPES[payroll?.type]
          } ${payrollVoucher.id}`,
          id: payroll?.employeeName || '',
          type: 'payrollvoucher',
          credit: amount,
          runningBalance:
            paidThroughAccount?.amount - Number(totalSalaryAmount),
          organization: payrollVoucher.organization,
          company: payrollVoucher.company,
        });
        await transaction2.save({ session });

        transactionList.push(transaction?._id, transaction2?._id);

        if (!organization.isAccrualAccounting) {
          const transaction3 = new Transaction({
            account: salaryAccount._id,
            reference: `${payroll?.employeeName}-${
              PAYROLL_LIST_TYPES[payroll?.type]
            } ${payrollVoucher.id}`,
            id: payroll?.employeeName || '',
            type: 'payrollvoucher',
            debit: amount,
            runningBalance: salaryAccount?.amount + Number(totalSalaryAmount),
            organization: payrollVoucher.organization,
            company: payrollVoucher.company,
          });
          await transaction3.save({ session });

          transactionList.push(transaction3?._id);
        }

        const employeeWallet = await Employee.findById(
          employee.employeeId
        ).session(session);

        if (employeeWallet) {
          const checkIfAdvanceAlreadyPaid = employeeWallet.advances.find(
            (advance) => advance.month === payroll?.month
          );
          if (checkIfAdvanceAlreadyPaid) {
            employeeWallet.advanceTaken -= checkIfAdvanceAlreadyPaid.value;
          }
          employeeWallet.salaryTaken += checkIfAdvanceAlreadyPaid
            ? checkIfAdvanceAlreadyPaid.value
            : amount;
          employeeWallet.salaries.push({
            month: payroll?.month,
            value: amount,
          });

          employeeWallet.totalWallet += amount;
          await employeeWallet.save({ session });

          const ledgerEntries =
            amount > 0
              ? [
                  {
                    month: payroll?.month,
                    amount,
                    payrollId: payroll?._id,
                    type: payroll?.type,
                  },
                ]
              : [];

          await EmployeeLedger.findOneAndUpdate(
            {
              organization: payroll?.organization,
              employee: payroll?.employeeId,
            },
            { $push: { ledger: { $each: ledgerEntries } } },
            { new: true, upsert: true, session }
          );
        }
      }
    } else if (payrollVoucher.type === 'advance') {
      const { employeeId } = payrollVoucher.employeeIds[0];
      const { payrollId } = payrollVoucher.employeeIds[0];
      const payroll = await Payroll.findById(payrollId).session(session);

      const employee = await Employee.findById(employeeId).session(session);

      if (employee) {
        const valuePerMonth = payroll.salary / payroll.numberOfMonths;

        const dataEntries = Array.from(
          { length: payroll.numberOfMonths },
          (_, i) => {
            const date = new Date(payroll.month);
            date.setMonth(date.getMonth() + i);
            const month = MONTH_NAMES[date.getMonth()];
            const year = date.getFullYear();
            return {
              month: `${month}-${year}`,
              value: valuePerMonth,
            };
          }
        );

        employee.advanceTaken += payroll.salary;
        employee.advances.push(...dataEntries);
        await employee.save({ session });

        const ledgerEntries = Array.from(
          { length: payroll.numberOfMonths },
          (_, i) => {
            const date = new Date(payroll.startDate);
            date.setMonth(date.getMonth() + i);
            // Handle year rollover when adding months
            const month = MONTH_NAMES[date.getMonth()];
            const year = date.getFullYear();
            return {
              month: `${month}-${year}`,
              amount: payroll.salary / payroll.numberOfMonths,
              payrollId: payroll._id,
              type: payroll.type,
            };
          }
        );

        await EmployeeLedger.findOneAndUpdate(
          {
            organization: payroll.organization,
            employee: payroll.employeeId,
          },
          { $push: { ledger: { $each: ledgerEntries } } },
          { new: true, upsert: true, session }
        );

        paidThroughAccount.amount -= payroll.salary;
        await paidThroughAccount.save({ session });

        const transaction = new Transaction({
          account: paidThroughAccount._id,
          reference: `${payroll.employeeName}-${
            PAYROLL_LIST_TYPES[payroll.type]
          } ${payrollVoucher.id}`,
          id: `${payroll.employeeName}`,
          type: 'payrollvoucher',
          credit: payroll.salary,
          runningBalance: paidThroughAccount?.amount,
          organization: payroll.organization,
          company: payroll.company,
        });
        await transaction.save({ session });

        transactionList.push(transaction?._id);

        if (!organization.isAccrualAccounting) {
          salaryAccount.amount += payroll.salary;
          await salaryAccount.save({ session });

          const transaction2 = new Transaction({
            account: salaryAccount._id,
            reference: `${payroll.employeeName}-${
              PAYROLL_LIST_TYPES[payroll.type]
            } ${payrollVoucher.id}`,
            id: `${payroll.employeeName}`,
            type: 'payrollvoucher',
            debit: payroll.salary,
            runningBalance: salaryAccount?.amount,
            organization: payroll.organization,
            company: payroll.company,
          });
          await transaction2.save({ session });

          transactionList.push(transaction2?._id);
        }

        payrollVoucher.transactions = transactionList;
        await payrollVoucher.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(payrollVoucher);
      }
    } else if (payrollVoucher.type === 'loan') {
      const { employeeId, payrollId } = payrollVoucher.employeeIds[0];
      const payroll = await Payroll.findById(payrollId).session(session);

      const employee = await Employee.findById(employeeId).session(session);

      if (employee) {
        employee.loanTaken += payroll.salary;
        employee.loans.push({
          month: payroll.month,
          value: payroll.salary,
        });
        employee.totalWallet += payroll.salary;

        await employee.save({ session });

        paidThroughAccount.amount -= payroll.salary;
        await paidThroughAccount.save({ session });

        const transaction = new Transaction({
          account: paidThroughAccount._id,
          reference: `${payroll.employeeName}-${
            PAYROLL_LIST_TYPES[payroll.type]
          } ${payrollVoucher.id}`,
          id: `${payroll.employeeName}`,
          type: 'payrollvoucher',
          credit: payroll.salary,
          runningBalance: paidThroughAccount?.amount,
          organization: payroll.organization,
          company: payroll.company,
        });
        await transaction.save({ session });

        transactionList.push(transaction?._id);

        if (!organization.isAccrualAccounting) {
          salaryAccount.amount += payroll.salary;
          await salaryAccount.save({ session });

          const transaction2 = new Transaction({
            account: salaryAccount._id,
            reference: `${payroll.employeeName}-${
              PAYROLL_LIST_TYPES[payroll.type]
            } ${payrollVoucher.id}`,
            id: `${payroll.employeeName}`,
            type: 'payrollvoucher',
            debit: payroll.salary,
            runningBalance: salaryAccount?.amount,
            organization: payroll.organization,
            company: payroll.company,
          });
          await transaction2.save({ session });

          transactionList.push(transaction2?._id);
        }

        payrollVoucher.transactions = transactionList;
        await payrollVoucher.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json(payrollVoucher);
      }
    }
  } else if (payrollVoucher.groupPayroll) {
    const groupPayroll = await GroupPayroll.findById(
      payrollVoucher.groupPayroll
    ).session(session);

    if (groupPayroll) {
      for (const payroll of groupPayroll.payrollList) {
        const updatedPayroll = await Payroll.findById(payroll).session(session);

        if (updatedPayroll) {
          const amount = updatedPayroll?.totalPay || updatedPayroll?.salary;

          totalSalaryAmount += amount;

          let transactionId = '';

          if (updatedPayroll?.employeeName) {
            transactionId = `${updatedPayroll?.employeeName}-${
              PAYROLL_LIST_TYPES[updatedPayroll?.type]
            }`;
          }

          // DD-MM-YYYY of createdAt
          const createdAt = new Date(updatedPayroll.createdAt);
          transactionId = `${transactionId}-${createdAt.getDate()}-${
            createdAt.getMonth() + 1
          }-${createdAt.getFullYear()} ${payrollVoucher.id}`;

          const transaction = new Transaction({
            account: salaryPayableAccount._id,
            reference: transactionId,
            id: `${updatedPayroll?.employeeName}`,
            type: 'payrollvoucher',
            debit: amount,
            runningBalance:
              salaryPayableAccount?.amount - Number(totalSalaryAmount),
            organization: payroll.organization,
            company: payroll.company,
          });
          await transaction.save({ session });

          const transaction2 = new Transaction({
            account: paidThroughAccount._id,
            reference: `${updatedPayroll?.employeeName}-${
              PAYROLL_LIST_TYPES[updatedPayroll?.type]
            } ${payrollVoucher.id}`,
            id: `${updatedPayroll?.employeeName}`,
            type: 'payrollvoucher',
            credit: amount,
            runningBalance:
              paidThroughAccount?.amount - Number(totalSalaryAmount),
            organization: payroll.organization,
            company: payroll.company,
          });
          await transaction2.save({ session });

          transactionList.push(transaction?._id, transaction2?._id);

          if (!organization.isAccrualAccounting) {
            const transaction3 = new Transaction({
              account: salaryAccount._id,
              reference: `${updatedPayroll?.employeeName}-${
                PAYROLL_LIST_TYPES[updatedPayroll?.type]
              } ${payrollVoucher.id}`,
              id: `${updatedPayroll?.employeeName}`,
              type: 'payrollvoucher',
              debit: amount,
              runningBalance: salaryAccount?.amount + Number(totalSalaryAmount),
              organization: payroll.organization,
              company: payroll.company,
            });
            await transaction3.save({ session });

            transactionList.push(transaction3?._id);
          }

          const employee = await Employee.findById(payroll?.employeeId).session(
            session
          );

          const checkIfSalaryAlreadyPaid = employee?.salaries?.find(
            (salary) => salary.month === payroll?.month
          );
          if (checkIfSalaryAlreadyPaid) {
            employee.advanceTaken -= checkIfSalaryAlreadyPaid.value;
          }
          employee.salaryTaken -= checkIfSalaryAlreadyPaid
            ? checkIfSalaryAlreadyPaid.value
            : amount;
          employee.salaries.splice(
            employee.salaries.findIndex(
              (entry) => entry.month === payroll?.month
            ),
            1
          );

          employee.totalWallet -= amount;
          await employee.save({ session });

          const ledgerEntries =
            amount > 0
              ? [
                  {
                    month: payroll?.month,
                    amount,
                    payrollId: payroll?._id,
                    type: payroll?.type,
                  },
                ]
              : [];

          await EmployeeLedger.findOneAndUpdate(
            {
              organization: payroll?.organization,
              employee: payroll?.employeeId,
            },
            { $push: { ledger: { $each: ledgerEntries } } },
            { new: true, upsert: true, session }
          );
        }
      }
    }
  }

  salaryPayableAccount.amount -= totalSalaryAmount;
  await salaryPayableAccount.save({ session });

  paidThroughAccount.amount -= totalSalaryAmount;
  await paidThroughAccount.save({ session });

  if (!organization.isAccrualAccounting) {
    salaryAccount.amount += totalSalaryAmount;
    await salaryAccount.save({ session });
  }

  payrollVoucher.transactions = transactionList;
  await payrollVoucher.save({ session });

  return null;
};

const createPayrollVoucher = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      employeeIds,
      salary,
      type,
      paidThrough,
      paymentMode,
      paymentDate,
      costCenter,
      notes,
      termsCondition,
      month = new Date(),
      company,
      organization,
      id,
      customID,
      prefix,
      groupPayroll,
      docAttached,
      salaryAccount,
    } = req.body;

    let lastInsertedId = await LastInsertedId.findOne({
      entity: 'PayrollVoucher',
      organization,
    });
    if (!lastInsertedId) {
      lastInsertedId = new LastInsertedId({
        entity: 'PayrollVoucher',
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
    const payrollVoucherPrefix = prefix || lastInsertedId.prefix || '';
    if (prefix) {
      lastInsertedId.prefix = prefix;
      await lastInsertedId.save();
    }

    const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

    const dateUsingMonth = new Date(month);

    // Extract month and year from date as january-2024
    const currentMonth = MONTH_NAMES[dateUsingMonth.getMonth()];
    const currentYear = dateUsingMonth.getFullYear();
    const monthStart = `${currentMonth}-${currentYear}`;

    const hasApproval = await ifHasApproval('payrollvoucher', organization);

    const payrollVoucher = new PayrollVoucher({
      id: customID ? customID : payrollVoucherPrefix + paddedId,
      employeeIds,
      salary,
      type,
      paymentDate,
      paidThrough,
      paymentMode,
      costCenter,
      notes,
      termsCondition,
      month: monthStart,
      company,
      organization,
      groupPayroll,
      approval: hasApproval ? 'pending' : 'none',
      docAttached,
      salaryAccount,
    });
    const savedPayrollVoucher = await payrollVoucher.save({ session });

    const payrollIds = employeeIds.map((employee) => employee.payrollId);

    if (payrollIds.length > 0) {
      await Payroll.updateMany(
        { _id: { $in: payrollIds } },
        { $set: { voucherCreated: true } }
      );
    }
    if (groupPayroll) {
      await GroupPayroll.findByIdAndUpdate(groupPayroll, {
        $set: { voucherCreated: true },
      });
    }

    await createActivityLog({
      userId: req.id,
      action: 'create',
      type: 'payrollVoucher',
      actionId: savedPayrollVoucher.id,
      organization: savedPayrollVoucher.organization,
      company: savedPayrollVoucher.company,
    });

    if (hasApproval) {
      await findNextApprovalLevelAndNotify(
        'payrollvoucher',
        'pending',
        savedPayrollVoucher.organization,
        savedPayrollVoucher.company,
        savedPayrollVoucher.id,
        'Payroll Voucher',
        'payrollvoucher',
        savedPayrollVoucher._id
      );
    } else {
      await approvePayrollVoucher(savedPayrollVoucher, session, res);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Payroll voucher created successfully',
      data: savedPayrollVoucher,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw new ServerError(error.message);
  }
});

const updatePayrollVoucher = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      employeeIds,
      salary,
      type,
      paidThrough,
      paymentMode,
      paymentDate,
      costCenter,
      notes,
      termsCondition,
      month = new Date(),
      groupPayroll,
      timesheetPayroll,
      docAttached,
      salaryAccount,
    } = req.body;

    const { is_revised } = req.query;

    const payrollVoucher = await PayrollVoucher.findById(req.params.id);

    if (!payrollVoucher) {
      await session.abortTransaction();
      session.endSession();
      throw new NotFoundError('Payroll Voucher not found');
    }

    const oldpayrollIds = payrollVoucher.employeeIds.map(
      (employee) => employee.payrollId
    );

    if (oldpayrollIds.length > 0) {
      await Payroll.updateMany(
        { _id: { $in: oldpayrollIds } },
        { $set: { voucherCreated: false } }
      );
    }
    if (payrollVoucher.groupPayroll) {
      await GroupPayroll.findByIdAndUpdate(payrollVoucher.groupPayroll, {
        $set: { voucherCreated: false },
      });
    }

    if (
      payrollVoucher.approval === 'approved1' ||
      payrollVoucher.approval === 'approved2' ||
      payrollVoucher.approval === 'none'
    ) {
      if (payrollVoucher.transactions?.length > 0) {
        await Transaction.deleteMany({
          _id: { $in: payrollVoucher.transactions },
        });
      }

      const salaryPayableAccount = await Account.findOne({
        accountName: 'Salary Payable',
        organization: payrollVoucher.organization,
      });

      if (!salaryPayableAccount) {
        await session.abortTransaction();
        session.endSession();
        throw new NotFoundError('Salary Payable account not found');
      }

      const paidThroughAccount = await Account.findById(
        payrollVoucher.paidThrough
      );

      if (!paidThroughAccount) {
        await session.abortTransaction();
        session.endSession();
        throw new NotFoundError('Paid through account not found');
      }

      const payrollAccountName =
        payrollVoucher.type === 'advance'
          ? 'Employee Advance'
          : payrollVoucher.type === 'loan'
            ? 'Employee Loan'
            : 'Salary and wages';

      let salaryAccount;

      const organization = await Organization.findById(
        payrollVoucher.organization
      ).select('isAccrualAccounting');

      if (!organization.isAccrualAccounting) {
        salaryAccount = payrollVoucher.salaryAccount
          ? await Account.findById(payrollVoucher.salaryAccount).session(
              session
            )
          : await Account.findOne({
              accountName: payrollAccountName,
              organization: payrollVoucher.organization,
            }).session(session);
      }

      let totalSalaryAmount = 0;

      if (payrollVoucher.employeeIds?.length > 0) {
        if (payrollVoucher.type === 'full') {
          for (const employee of payrollVoucher.employeeIds) {
            const payroll = await Payroll.findById(employee.payrollId);
            const amount = employee?.totalPay || employee?.salary;
            totalSalaryAmount += amount;

            const employeeWallet = await Employee.findById(employee.employeeId);

            if (employeeWallet) {
              const checkIfAdvanceAlreadyPaid = employeeWallet.advances.find(
                (advance) => advance.month === payroll?.month
              );
              if (checkIfAdvanceAlreadyPaid) {
                employeeWallet.advanceTaken += checkIfAdvanceAlreadyPaid.value;
              }
              employeeWallet.salaryTaken -= checkIfAdvanceAlreadyPaid
                ? checkIfAdvanceAlreadyPaid.value
                : amount;
              employeeWallet.salaries.splice(
                employeeWallet.salaries.findIndex(
                  (entry) => entry.month === payroll?.month
                ),
                1
              );

              employeeWallet.totalWallet -= amount;
              await employeeWallet.save();

              await EmployeeLedger.findOneAndUpdate(
                {
                  organization: payroll?.organization,
                  employee: payroll?.employeeId,
                },
                {
                  $pull: {
                    ledger: {
                      month: payroll?.month,
                      type: payroll?.type,
                    },
                  },
                },
                { new: true }
              );
            }
          }
        } else if (payrollVoucher.type === 'advance') {
          const { employeeId, payrollId } = payrollVoucher.employeeIds[0];
          const payroll = await Payroll.findById(payrollId);

          const employee = await Employee.findById(employeeId);

          const amount = payrollVoucher.employeeIds[0].salary;

          if (employee) {
            employee.advanceTaken -= amount;
            employee.advances.splice(
              employee.advances.findIndex(
                (entry) => entry.month === payroll.month
              ),
              1
            );
            employee.totalWallet -= amount;
            await employee.save();
          }

          const monthsToRemove = Array.from(
            { length: payroll.numberOfMonths },
            (_, i) => {
              const date = new Date(payroll.startDate);
              date.setMonth(date.getMonth() + i);
              const month = MONTH_NAMES[date.getMonth()];
              const year = date.getFullYear();
              return `${month}-${year}`;
            }
          );

          await EmployeeLedger.findOneAndUpdate(
            {
              organization: payroll.organization,
              employee: payroll.employeeId,
            },
            {
              $pull: {
                ledger: {
                  month: { $in: monthsToRemove },
                },
              },
            },
            { new: true }
          );

          paidThroughAccount.amount += payroll.salary;
          await paidThroughAccount.save();
          totalSalaryAmount += payroll.salary;
        } else if (payrollVoucher.type === 'loan') {
          const { employeeId, payrollId } = payrollVoucher.employeeIds[0];
          const payroll = await Payroll.findById(payrollId);

          const employee = await Employee.findById(employeeId);

          const amount = payrollVoucher.employeeIds[0].salary;

          if (employee) {
            employee.loanTaken -= amount;
            employee.loans.splice(
              employee.loans.findIndex(
                (entry) => entry.month === payroll.month
              ),
              1
            );
            employee.totalWallet -= amount;
            await employee.save();
          }

          const monthsToRemove = Array.from(
            { length: payroll.numberOfMonths },
            (_, i) => {
              const date = new Date(payroll.startDate);
              date.setMonth(date.getMonth() + i);
              const month = MONTH_NAMES[date.getMonth()];
              const year = date.getFullYear();
              return `${month}-${year}`;
            }
          );

          await EmployeeLedger.findOneAndUpdate(
            {
              organization: payroll.organization,
              employee: payroll.employeeId,
            },
            {
              $pull: {
                ledger: {
                  month: { $in: monthsToRemove },
                },
              },
            },
            { new: true }
          );

          paidThroughAccount.amount += payroll.salary;
          await paidThroughAccount.save();
          totalSalaryAmount += payroll.salary;
        }
      } else if (payrollVoucher.groupPayroll) {
        const groupPayroll = await GroupPayroll.findById(
          payrollVoucher.groupPayroll
        );

        if (groupPayroll) {
          for (const payroll of groupPayroll.payrollList) {
            const updatedPayroll = await Payroll.findById(payroll);

            if (updatedPayroll) {
              const amount = updatedPayroll?.totalPay || updatedPayroll?.salary;

              totalSalaryAmount += amount;

              const employee = await Employee.findById(payroll.employeeId);

              const checkIfSalaryAlreadyPaid = employee?.salaries?.find(
                (salary) => salary.month === payroll?.month
              );
              if (checkIfSalaryAlreadyPaid) {
                employee.advanceTaken += checkIfSalaryAlreadyPaid.value;
              }
              employee.salaryTaken -= checkIfSalaryAlreadyPaid
                ? checkIfSalaryAlreadyPaid.value
                : amount;
              employee.salaries.splice(
                employee.salaries.findIndex(
                  (entry) => entry.month === payroll?.month
                ),
                1
              );

              employee.totalWallet -= amount;
              await employee.save();
            }
          }
        }
      }

      salaryPayableAccount.amount += totalSalaryAmount;
      await salaryPayableAccount.save();

      paidThroughAccount.amount += totalSalaryAmount;
      await paidThroughAccount.save();

      if (!organization.isAccrualAccounting) {
        salaryAccount.amount += totalSalaryAmount;
        await salaryAccount.save();
      }
    }

    let newId = payrollVoucher.id;

    if (
      is_revised !== 'undefined' &&
      is_revised !== undefined &&
      is_revised !== null &&
      is_revised === 'true'
    ) {
      const baseId = payrollVoucher.id.split('-REV')[0];
      const currentRevision = payrollVoucher.id.includes('-REV')
        ? parseInt(payrollVoucher.id.split('-REV')[1])
        : 0;

      const newRevision = currentRevision + 1;

      newId = `${baseId}-REV${newRevision}`;
    }

    const dateUsingMonth = new Date(month);

    // Extract month and year from date as january-2024
    const currentMonth = MONTH_NAMES[dateUsingMonth.getMonth()];
    const currentYear = dateUsingMonth.getFullYear();
    const monthStart = `${currentMonth}-${currentYear}`;

    const payrollIds = employeeIds.map((employee) => employee.payrollId);

    if (payrollIds.length > 0) {
      await Payroll.updateMany(
        { _id: { $in: payrollIds } },
        { $set: { voucherCreated: true } }
      );
    }
    if (groupPayroll) {
      await GroupPayroll.findByIdAndUpdate(groupPayroll, {
        $set: { voucherCreated: true },
      });
    }

    const hasApproval = await ifHasApproval(
      'payrollvoucher',
      payrollVoucher.organization
    );

    payrollVoucher.approval = hasApproval ? 'pending' : 'none';

    payrollVoucher.id = newId;
    payrollVoucher.employeeIds = employeeIds;
    payrollVoucher.salary = salary;
    payrollVoucher.type = type;
    payrollVoucher.paymentDate = paymentDate;
    payrollVoucher.paidThrough = paidThrough;
    payrollVoucher.paymentMode = paymentMode;
    payrollVoucher.costCenter = costCenter;
    payrollVoucher.notes = notes;
    payrollVoucher.termsCondition = termsCondition;
    payrollVoucher.month = monthStart;
    payrollVoucher.groupPayroll = groupPayroll;
    payrollVoucher.timesheetPayroll = timesheetPayroll;
    payrollVoucher.docAttached = docAttached;
    payrollVoucher.salaryAccount = salaryAccount;
    payrollVoucher.approval = hasApproval ? 'pending' : 'none';
    payrollVoucher.verifiedBy = null;
    payrollVoucher.approvedBy1 = null;
    payrollVoucher.approvedBy2 = null;
    payrollVoucher.verifiedAt = null;
    payrollVoucher.approvedAt1 = null;
    payrollVoucher.approvedAt2 = null;
    payrollVoucher.reviewedBy = null;
    payrollVoucher.reviewedAt = null;
    payrollVoucher.acknowledgedBy = null;
    payrollVoucher.acknowledgedAt = null;

    const savedPayrollVoucher = await payrollVoucher.save();

    await createActivityLog({
      userId: req.id,
      action: 'update',
      type: 'payrollVoucher',
      actionId: savedPayrollVoucher.id,
      organization: savedPayrollVoucher.organization,
      company: savedPayrollVoucher.company,
    });

    if (!hasApproval) {
      await approvePayrollVoucher(savedPayrollVoucher, session, res);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Payroll Voucher created successfully',
      data: savedPayrollVoucher,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw new ServerError(error.message);
  }
});

const voucherApprove = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { user, approval } = req.body;
  try {
    const payrollVoucher = await PayrollVoucher.findById(req.params.id);

    if (!payrollVoucher) {
      await session.abortTransaction();
      session.endSession();
      throw new NotFoundError('Payroll Voucher not found');
    }

    const oldApproval = payrollVoucher.approval;
    payrollVoucher.approval = approval;

    if (approval === 'approved1') {
      payrollVoucher.approvedBy1 = user || null;
      payrollVoucher.approvedAt1 = new Date();
    } else if (approval === 'approved2') {
      payrollVoucher.approvedBy2 = user || null;
      payrollVoucher.approvedAt2 = new Date();
    }
    const updatedPayrollVoucher = await payrollVoucher.save();

    if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
      await approvePayrollVoucher(updatedPayrollVoucher, session, res);
      if (approval === 'approved1') {
        await findNextApprovalLevelAndNotify(
          'payrollvoucher',
          approval,
          updatedPayrollVoucher.organization,
          updatedPayrollVoucher.company,
          updatedPayrollVoucher.id,
          'Payroll Voucher',
          'payrollvoucher',
          updatedPayrollVoucher._id
        );
      }
    }
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Payroll Voucher approved successfully',
      data: updatedPayrollVoucher,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw new ServerError(error.message);
  }
});

const voucherReject = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { approvalComment } = req.body;

    const payrollVoucher = await PayrollVoucher.findById(req.params.id);

    if (!payrollVoucher) {
      await session.abortTransaction();
      session.endSession();
      throw new NotFoundError('Payroll Voucher not found');
    }

    if (payrollVoucher.transactions?.length > 0) {
      await Transaction.deleteMany({
        _id: { $in: payrollVoucher.transactions },
      });
    }

    const oldApproval = payrollVoucher.approval;

    payrollVoucher.approval = 'rejected';
    payrollVoucher.approvalComment = approvalComment || null;
    payrollVoucher.verifiedBy = null;
    payrollVoucher.approvedBy1 = null;
    payrollVoucher.approvedBy2 = null;
    payrollVoucher.verifiedAt = null;
    payrollVoucher.approvedAt1 = null;
    payrollVoucher.approvedAt2 = null;
    payrollVoucher.reviewedBy = null;
    payrollVoucher.reviewedAt = null;
    payrollVoucher.acknowledgedBy = null;
    payrollVoucher.acknowledgedAt = null;

    await payrollVoucher.save({ session });

    if (oldApproval === 'approved1' || oldApproval === 'approved2') {
      const salaryPayableAccount = await Account.findOne({
        accountName: 'Salary Payable',
        organization: payrollVoucher.organization,
      });

      if (!salaryPayableAccount) {
        await session.abortTransaction();
        session.endSession();
        throw new NotFoundError('Salary Payable account not found');
      }

      const paidThroughAccount = await Account.findById(
        payrollVoucher.paidThrough
      );

      if (!paidThroughAccount) {
        await session.abortTransaction();
        session.endSession();
        throw new NotFoundError('Paid through account not found');
      }

      const payrollAccountName =
        payrollVoucher.type === 'advance'
          ? 'Employee Advance'
          : payrollVoucher.type === 'loan'
            ? 'Employee Loan'
            : 'Salary and wages';

      let salaryAccount;

      const organization = await Organization.findById(
        payrollVoucher.organization
      ).select('isAccrualAccounting');

      if (!organization.isAccrualAccounting) {
        salaryAccount = payrollVoucher.salaryAccount
          ? await Account.findById(payrollVoucher.salaryAccount).session(
              session
            )
          : await Account.findOne({
              accountName: payrollAccountName,
              organization: payrollVoucher.organization,
            }).session(session);
      }

      if (!salaryAccount) {
        await session.abortTransaction();
        session.endSession();
        throw new NotFoundError('Salary account not found');
      }

      let totalSalaryAmount = 0;

      if (payrollVoucher.employeeIds?.length > 0) {
        if (payrollVoucher.type === 'full') {
          for (const employee of payrollVoucher.employeeIds) {
            const payroll = await Payroll.findById(employee.payrollId);
            const amount = employee?.totalPay || employee?.salary;

            totalSalaryAmount += amount;

            const employeeWallet = await Employee.findById(employee.employeeId);

            if (employeeWallet) {
              const checkIfAdvanceAlreadyPaid = employeeWallet.advances.find(
                (advance) => advance.month === payroll?.month
              );
              if (checkIfAdvanceAlreadyPaid) {
                employeeWallet.advanceTaken += checkIfAdvanceAlreadyPaid.value;
              }
              employeeWallet.salaryTaken -= checkIfAdvanceAlreadyPaid
                ? checkIfAdvanceAlreadyPaid.value
                : amount;
              employeeWallet.salaries.splice(
                employeeWallet.salaries.findIndex(
                  (entry) => entry.month === payroll?.month
                ),
                1
              );

              employeeWallet.totalWallet -= amount;
              await employeeWallet.save();

              await EmployeeLedger.findOneAndUpdate(
                {
                  organization: payroll?.organization,
                  employee: payroll?.employeeId,
                },
                {
                  $pull: {
                    ledger: {
                      month: payroll?.month,
                      type: payroll?.type,
                    },
                  },
                },
                { new: true }
              );
            }
          }
        } else if (payrollVoucher.type === 'advance') {
          const { employeeId, payrollId } = payrollVoucher.employeeIds[0];
          const payroll = await Payroll.findById(payrollId);

          const employee = await Employee.findById(employeeId);

          const amount = payrollVoucher.employeeIds[0].salary;

          if (employee) {
            employee.advanceTaken -= amount;
            employee.advances.splice(
              employee.advances.findIndex(
                (entry) => entry.month === payroll.month
              ),
              1
            );
            employee.totalWallet -= amount;
            await employee.save();
          }

          const monthsToRemove = Array.from(
            { length: payroll.numberOfMonths },
            (_, i) => {
              const date = new Date(payroll.startDate);
              date.setMonth(date.getMonth() + i);
              const month = MONTH_NAMES[date.getMonth()];
              const year = date.getFullYear();
              return `${month}-${year}`;
            }
          );

          await EmployeeLedger.findOneAndUpdate(
            {
              organization: payroll.organization,
              employee: payroll.employeeId,
            },
            {
              $pull: {
                ledger: {
                  month: { $in: monthsToRemove },
                },
              },
            },
            { new: true }
          );

          paidThroughAccount.amount += payroll.salary;
          await paidThroughAccount.save();

          res.status(201).json(payrollVoucher);
        } else if (payrollVoucher.type === 'loan') {
          const { employeeId, payrollId } = payrollVoucher.employeeIds[0];
          const payroll = await Payroll.findById(payrollId);

          const employee = await Employee.findById(employeeId);

          const amount = payrollVoucher.employeeIds[0].salary;

          if (employee) {
            employee.loanTaken -= amount;
            employee.loans.splice(
              employee.loans.findIndex(
                (entry) => entry.month === payroll.month
              ),
              1
            );
            employee.totalWallet -= amount;
            await employee.save();
          }

          const monthsToRemove = Array.from(
            { length: payroll.numberOfMonths },
            (_, i) => {
              const date = new Date(payroll.startDate);
              date.setMonth(date.getMonth() + i);
              const month = MONTH_NAMES[date.getMonth()];
              const year = date.getFullYear();
              return `${month}-${year}`;
            }
          );

          // Remove all relevant monthly entries
          await EmployeeLedger.findOneAndUpdate(
            {
              organization: payroll.organization,
              employee: payroll.employeeId,
            },
            {
              $pull: {
                ledger: {
                  month: { $in: monthsToRemove },
                },
              },
            },
            { new: true }
          );

          paidThroughAccount.amount += payroll.salary;
          await paidThroughAccount.save();

          res.status(201).json(payrollVoucher);
        }
      } else if (payrollVoucher.groupPayroll) {
        const groupPayroll = await GroupPayroll.findById(
          payrollVoucher.groupPayroll
        );

        if (groupPayroll) {
          for (const payroll of groupPayroll.payrollList) {
            const updatedPayroll = await Payroll.findById(payroll);

            if (updatedPayroll) {
              const amount = updatedPayroll?.totalPay || updatedPayroll?.salary;

              totalSalaryAmount += amount;

              const employee = await Employee.findById(payroll.employeeId);

              const checkIfSalaryAlreadyPaid = employee?.salaries?.find(
                (salary) => salary.month === payroll?.month
              );
              if (checkIfSalaryAlreadyPaid) {
                employee.advanceTaken += checkIfSalaryAlreadyPaid.value;
              }
              employee.salaryTaken -= checkIfSalaryAlreadyPaid
                ? checkIfSalaryAlreadyPaid.value
                : amount;
              employee.salaries.splice(
                employee.salaries.findIndex(
                  (entry) => entry.month === payroll?.month
                ),
                1
              );

              employee.totalWallet -= amount;
              await employee.save();
            }
          }
        }
      }

      salaryPayableAccount.amount += totalSalaryAmount;
      await salaryPayableAccount.save();

      paidThroughAccount.amount += totalSalaryAmount;
      await paidThroughAccount.save();

      if (!organization.isAccrualAccounting) {
        salaryAccount.amount += totalSalaryAmount;
        await salaryAccount.save();
      }
    }
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Payroll voucher created successfully',
      data: payrollVoucher,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw new ServerError(error.message);
  }
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const payroll = await PayrollVoucher.findById(id);

  if (!payroll) {
    throw new NotFoundError('Payroll Voucher not found');
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

  await findNextApprovalLevelAndNotify(
    'payrollvoucher',
    approval,
    payroll.organization,
    payroll.company,
    payroll.id,
    'Payroll Voucher',
    'payrollvoucher',
    payroll._id
  );

  res.status(200).json({
    success: true,
    message: 'Payroll voucher updated successfully',
    data: payroll,
  });
});

const invalidatePayrollVoucher = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payrollVoucher = await PayrollVoucher.findById(req.params.id);

    if (!payrollVoucher) {
      await session.abortTransaction();
      session.endSession();
      throw new NotFoundError('Payroll Voucher not found');
    }

    if (payrollVoucher.transactions?.length > 0) {
      await Transaction.deleteMany({
        _id: { $in: payrollVoucher.transactions },
      });
    }

    const oldApproval = payrollVoucher.approval;

    const hasApproval = await ifHasApproval(
      'payrollvoucher',
      payrollVoucher.organization
    );

    payrollVoucher.valid = false;
    payrollVoucher.approval = hasApproval ? 'rejected' : 'none';
    payrollVoucher.verifiedBy = null;
    payrollVoucher.approvedBy1 = null;
    payrollVoucher.approvedBy2 = null;
    payrollVoucher.verifiedAt = null;
    payrollVoucher.approvedAt1 = null;
    payrollVoucher.approvedAt2 = null;
    payrollVoucher.reviewedBy = null;
    payrollVoucher.reviewedAt = null;
    payrollVoucher.acknowledgedBy = null;
    payrollVoucher.acknowledgedAt = null;

    await payrollVoucher.save({ session });

    if (
      oldApproval === 'approved1' ||
      oldApproval === 'approved2' ||
      oldApproval === 'none'
    ) {
      const salaryPayableAccount = await Account.findOne({
        accountName: 'Salary Payable',
        organization: payrollVoucher.organization,
      });

      if (!salaryPayableAccount) {
        await session.abortTransaction();
        session.endSession();
        throw new NotFoundError('Salary Payable account not found');
      }

      const paidThroughAccount = await Account.findById(
        payrollVoucher.paidThrough
      );

      if (!paidThroughAccount) {
        await session.abortTransaction();
        session.endSession();
        throw new NotFoundError('Paid through account not found');
      }

      const payrollAccountName =
        payrollVoucher.type === 'advance'
          ? 'Employee Advance'
          : payrollVoucher.type === 'loan'
            ? 'Employee Loan'
            : 'Salary and wages';

      let salaryAccount;

      const organization = await Organization.findById(
        payrollVoucher.organization
      ).select('isAccrualAccounting');

      if (!organization.isAccrualAccounting) {
        salaryAccount = payrollVoucher.salaryAccount
          ? await Account.findById(payrollVoucher.salaryAccount).session(
              session
            )
          : await Account.findOne({
              accountName: payrollAccountName,
              organization: payrollVoucher.organization,
            }).session(session);
      }

      if (!salaryAccount) {
        await session.abortTransaction();
        session.endSession();
        throw new NotFoundError('Salary account not found');
      }

      let totalSalaryAmount = 0;

      if (payrollVoucher.employeeIds?.length > 0) {
        if (payrollVoucher.type === 'full') {
          for (const employee of payrollVoucher.employeeIds) {
            const payroll = await Payroll.findById(employee.payrollId);
            const amount = employee?.totalPay || employee?.salary;

            totalSalaryAmount += amount;

            const employeeWallet = await Employee.findById(employee.employeeId);

            if (employeeWallet) {
              const checkIfAdvanceAlreadyPaid = employeeWallet.advances.find(
                (advance) => advance.month === payroll?.month
              );
              if (checkIfAdvanceAlreadyPaid) {
                employeeWallet.advanceTaken += checkIfAdvanceAlreadyPaid.value;
              }
              employeeWallet.salaryTaken -= checkIfAdvanceAlreadyPaid
                ? checkIfAdvanceAlreadyPaid.value
                : amount;
              employeeWallet.salaries.splice(
                employeeWallet.salaries.findIndex(
                  (entry) => entry.month === payroll?.month
                ),
                1
              );

              employeeWallet.totalWallet -= amount;
              await employeeWallet.save();

              await EmployeeLedger.findOneAndUpdate(
                {
                  organization: payroll?.organization,
                  employee: payroll?.employeeId,
                },
                {
                  $pull: {
                    ledger: {
                      month: payroll?.month,
                      type: payroll?.type,
                    },
                  },
                },
                { new: true }
              );
            }
          }
        } else if (payrollVoucher.type === 'advance') {
          const { employeeId, payrollId } =
            payrollVoucher.employeeIds[0].employeeId;
          const payroll = await Payroll.findById(payrollId);

          const employee = await Employee.findById(employeeId);

          const amount = payrollVoucher.employeeIds[0].salary;

          if (employee) {
            employee.advanceTaken -= amount;
            employee.advances.splice(
              employee.advances.findIndex(
                (entry) => entry.month === payroll.month
              ),
              1
            );
            employee.totalWallet -= amount;
            await employee.save();
          }

          const monthsToRemove = Array.from(
            { length: payroll.numberOfMonths },
            (_, i) => {
              const date = new Date(payroll.startDate);
              date.setMonth(date.getMonth() + i);
              const month = MONTH_NAMES[date.getMonth()];
              const year = date.getFullYear();
              return `${month}-${year}`;
            }
          );

          await EmployeeLedger.findOneAndUpdate(
            {
              organization: payroll.organization,
              employee: payroll.employeeId,
            },
            {
              $pull: {
                ledger: {
                  month: { $in: monthsToRemove },
                },
              },
            },
            { new: true }
          );

          paidThroughAccount.amount += payroll.salary;
          await paidThroughAccount.save();

          res.status(201).json(payrollVoucher);
        } else if (payrollVoucher.type === 'loan') {
          const { employeeId, payrollId } =
            payrollVoucher.employeeIds[0].employeeId;
          const payroll = await Payroll.findById(payrollId);

          const employee = await Employee.findById(employeeId);

          const amount = payrollVoucher.employeeIds[0].salary;

          if (employee) {
            employee.loanTaken -= amount;
            employee.loans.splice(
              employee.loans.findIndex(
                (entry) => entry.month === payroll.month
              ),
              1
            );
            employee.totalWallet -= amount;
            await employee.save();
          }

          const monthsToRemove = Array.from(
            { length: payroll.numberOfMonths },
            (_, i) => {
              const date = new Date(payroll.startDate);
              date.setMonth(date.getMonth() + i);
              const month = MONTH_NAMES[date.getMonth()];
              const year = date.getFullYear();
              return `${month}-${year}`;
            }
          );

          // Remove all relevant monthly entries
          await EmployeeLedger.findOneAndUpdate(
            {
              organization: payroll.organization,
              employee: payroll.employeeId,
            },
            {
              $pull: {
                ledger: {
                  month: { $in: monthsToRemove },
                },
              },
            },
            { new: true }
          );

          paidThroughAccount.amount += payroll.salary;
          await paidThroughAccount.save();

          res.status(201).json(payrollVoucher);
        }
      } else if (payrollVoucher.groupPayroll) {
        const groupPayroll = await GroupPayroll.findById(
          payrollVoucher.groupPayroll
        );

        if (groupPayroll) {
          for (const payroll of groupPayroll.payrollList) {
            const updatedPayroll = await Payroll.findById(payroll);

            if (updatedPayroll) {
              const amount = updatedPayroll?.totalPay || updatedPayroll?.salary;

              totalSalaryAmount += amount;

              const employee = await Employee.findById(payroll.employeeId);

              const checkIfSalaryAlreadyPaid = employee?.salaries?.find(
                (salary) => salary.month === payroll?.month
              );
              if (checkIfSalaryAlreadyPaid) {
                employee.advanceTaken += checkIfSalaryAlreadyPaid.value;
              }
              employee.salaryTaken -= checkIfSalaryAlreadyPaid
                ? checkIfSalaryAlreadyPaid.value
                : amount;
              employee.salaries.splice(
                employee.salaries.findIndex(
                  (entry) => entry.month === payroll?.month
                ),
                1
              );

              employee.totalWallet -= amount;
              await employee.save();
            }
          }
        }
      }

      salaryPayableAccount.amount += totalSalaryAmount;
      await salaryPayableAccount.save();

      paidThroughAccount.amount += totalSalaryAmount;
      await paidThroughAccount.save();

      if (!organization.isAccrualAccounting) {
        salaryAccount.amount += totalSalaryAmount;
        await salaryAccount.save();
      }
    }
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Payroll voucher updated successfully',
      data: payrollVoucher,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    throw new ServerError(error.message);
  }
});

const getPayrollVouchers = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const payrolls = await PayrollVoucher.find({
    valid: true,
    organization: orgid,
  }).populate('paidThrough', ['accountName']);
  res.status(200).json({
    success: true,
    message: 'Payroll vouchers fetched successfully',
    data: payrolls,
  });
});

const getPayrollVoucherById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payrolls = await PayrollVoucher.findById(id)
    .populate('employeeIds.employeeId', [
      'firstName',
      'lastName',
      'employeeId',
      'role',
      'monthlyPay',
      'hourlyPay',
    ])
    .populate('groupPayroll', ['id', 'title'])
    .populate('paidThrough', ['accountName'])
    .populate('salaryAccount', ['accountName'])
    .populate('costCenter', 'unit')
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
    .populate('user', ['signature', 'role', 'fullName', 'userName'])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName']);

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

const getPayrollSlipById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const payrolls = await PayrollVoucher.findById(id)
    .populate('employeeId', [
      'firstName',
      'lastName',
      'employeeId',
      'dateOfJoining',
    ])
    .populate('paidThrough', ['accountName'])
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
    .populate('user', ['signature', 'role', 'fullName', 'userName'])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName']);
  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

const getPayrollVoucherByEmployee = asyncHandler(async (req, res) => {
  const { month } = req.params;
  const { employeeIds } = req.body;

  const dateUsingMonth = new Date(month);

  const currentMonth = MONTH_NAMES[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  const getpayrolls = await Payroll.find({
    employeeId: { $in: employeeIds },
    month: monthStart,
    type: 'full',
    voucherCreated: false,
  }).populate('employeeId', [
    'firstName',
    'lastName',
    'role',
    'monthlyPay',
    'hourlyPay',
    'employeeId',
  ]);

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: getpayrolls,
  });
});

const getAdvanceByEmployee = asyncHandler(async (req, res) => {
  const { month, empid } = req.params;

  const dateUsingMonth = new Date(month);

  const currentMonth = MONTH_NAMES[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  const getpayrolls = await Payroll.findOne({
    employeeId: empid,
    month: monthStart,
    type: 'advance',
    voucherCreated: false,
  }).populate('employeeId', [
    'firstName',
    'lastName',
    'role',
    'monthlyPay',
    'hourlyPay',
    'employeeId',
  ]);

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: getpayrolls,
  });
});

const getLoanByEmployee = asyncHandler(async (req, res) => {
  const { month, empid } = req.params;

  const dateUsingMonth = new Date(month);

  const currentMonth = MONTH_NAMES[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  const getpayrolls = await Payroll.findOne({
    employeeId: empid,
    month: monthStart,
    type: 'loan',
    voucherCreated: false,
  }).populate('employeeId', [
    'firstName',
    'lastName',
    'role',
    'monthlyPay',
    'hourlyPay',
    'employeeId',
  ]);

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: getpayrolls,
  });
});

const getMultiplePayrollsByMonth = asyncHandler(async (req, res) => {
  const { orgid, month } = req.params;

  const dateUsingMonth = new Date(month);

  const currentMonth = MONTH_NAMES[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  const groupPayrolls = await GroupPayroll.find({
    organization: orgid,
    month: monthStart,
    voucherCreated: false,
  });

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: {
      groupPayrolls,
    },
  });
});

const getPayrollByMonth = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const getpayrolls = await PayrollVoucher.find({
    organization: orgid,
    employeeIds: { $ne: null },
    valid: true,
  }).select('month salary');

  const payrolls = getpayrolls.reduce((acc, payroll) => {
    const { month, salary } = payroll.month;
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
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

const getAllPayrollByMonth = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const getpayrolls = await PayrollVoucher.find({
    organization: orgid,
    valid: true,
  }).select('month salary');

  const payrolls = getpayrolls.reduce((acc, payroll) => {
    const { month, salary } = payroll;
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
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

const getAdvanceLoansByMonth = asyncHandler(async (req, res) => {
  const { orgid, type } = req.params;

  const getpayrolls = await Payroll.find({
    organization: orgid,
    type,
  }).select(
    'month employeeName salary type startDate endDate paidThrough notes approval organization'
  );

  const payrolls = getpayrolls.reduce((acc, payroll) => {
    const { month, salary } = payroll;
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
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

//get payrolls by month
const getPayrollsByMonth = asyncHandler(async (req, res) => {
  const { month, orgid } = req.params;
  const { search_query } = req.query;

  const query = {
    month,
    employeeIds: { $ne: null },
    organization: orgid,
    valid: true,
    ...(search_query &&
      search_query !== '' && {
        id: { $regex: search_query, $options: 'i' },
      }),
  };

  const payrolls = await PayrollVoucher.find(query)
    .populate('employeeIds.employeeId', 'firstName lastName employeeId role')
    .sort({ paymentDate: -1 });

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

const getAllPayrollsByMonth = asyncHandler(async (req, res) => {
  const { month, orgid } = req.params;
  const { search_query } = req.query;

  const query = {
    month,
    valid: true,
    organization: orgid,
    ...(search_query &&
      search_query !== '' && {
        id: { $regex: search_query, $options: 'i' },
      }),
  };

  const payrolls = await PayrollVoucher.find(query)
    .populate('employeeIds.employeeId', 'firstName lastName employeeId role')
    .sort({ paymentDate: -1 });

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

const getMultipleTypePayrollVouchers = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { search_query } = req.query;

  const query = {
    organization: orgid,
    valid: true,
    type: {
      $nin: ['advance', 'loan'],
    },

    ...(search_query &&
      search_query !== '' && {
        id: { $regex: search_query, $options: 'i' },
      }),
  };

  const payrolls = await PayrollVoucher.find(query)
    .select(
      'employeeId employeeName approval salary type startDate endDate month paidThrough notes createdAt numberOfMonths transactions costCenter salaryAccount id paymentDate'
    )
    .sort({ paymentDate: -1 });

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

const getAdvanceLoansByMonthAndType = asyncHandler(async (req, res) => {
  const { month, orgid, type } = req.params;
  const { search_query } = req.query;

  const query = {
    month,
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
      'employeeId employeeName approval salary type startDate endDate month paidThrough notes createdAt numberOfMonths transactions costCenter salaryAccount'
    )
    .sort({ paymentDate: -1 });

  res.status(200).json({
    success: true,
    message: 'Payroll voucher fetched successfully',
    data: payrolls,
  });
});

const getEmployeeLedgerByPayroll = asyncHandler(async (req, res) => {
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
    throw new NotFoundError('Payroll not found');
  }

  if (!employeeLedger) {
    throw new NotFoundError('Employee ledger not found');
  }

  const ledger = employeeLedger.ledger.filter(
    (item) => item.payrollId?.toString() === payrollid
  );

  res.status(200).json({
    success: true,
    message: 'Employee ledger fetched successfully',
    data: {
      payroll: payroll.toObject(),
      employeeLedger: ledger,
    },
  });
});

module.exports = {
  createPayrollVoucher,
  updatePayrollVoucher,
  voucherApprove,
  voucherReject,
  updateApproval,
  invalidatePayrollVoucher,
  getPayrollVouchers,
  getPayrollVoucherById,
  getPayrollSlipById,
  getPayrollVoucherByEmployee,
  getAdvanceByEmployee,
  getLoanByEmployee,
  getMultiplePayrollsByMonth,
  getPayrollByMonth,
  getAllPayrollByMonth,
  getAdvanceLoansByMonth,
  getPayrollsByMonth,
  getAllPayrollsByMonth,
  getMultipleTypePayrollVouchers,
  getAdvanceLoansByMonthAndType,
  getEmployeeLedgerByPayroll,
};
