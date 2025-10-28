const mongoose = require('mongoose');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const ExpenseVoucherSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: '',
      required: true,
    },
    date: {
      type: Date,
      default: new Date(),
    },
    type: {
      type: String,
      enum: ['expense', 'employeeexpense', 'projectexpense'],
      default: 'expense',
    },
    paymentMode: {
      type: String,
    },
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
    employeeExpenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeExpense',
    },
    expenseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    paidThrough: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    amount: {
      type: Number,
      default: 0,
    },
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
    ],
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    docAttached: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
    approval: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'pending',
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    approvedBy1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt1: {
      type: Date,
    },
    approvedAt2: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    acknowledgedAt: {
      type: Date,
    },
    valid: {
      type: Boolean,
      default: true,
    },
    approvalComment: {
      type: String,
    },
  },
  { timestamps: true }
);

ExpenseVoucherSchema.index({ id: 1, organization: 1 }, { unique: true });

ExpenseVoucherSchema.index({ organization: 1 });

module.exports = mongoose.model('ExpenseVoucher', ExpenseVoucherSchema);
