const mongoose = require('mongoose');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const PayrollVoucherSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    employeeIds: [
      {
        employeeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        },
        payrollId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Payroll',
        },
        salary: {
          type: Number,
        },
        totalPay: {
          type: Number,
          default: 0,
        },
      },
    ],
    salary: {
      type: Number,
      required: true,
    },
    type: {
      enum: ['full', 'advance', 'loan'],
      type: String,
      required: true,
      default: 'full',
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    month: {
      type: String,
    },
    paidThrough: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    salaryAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    notes: {
      type: String,
    },
    termsCondition: {
      type: String,
    },
    approval: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'pending',
      index: true,
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
    isRejected: {
      type: Boolean,
      default: false,
    },
    approvedBy1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
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
    reviewedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: {
      type: Date,
    },
    approvalComment: {
      type: String,
    },
    paymentMode: {
      type: String,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    groupPayroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupPayroll',
    },
    timesheetPayroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimesheetPayroll',
    },
    docAttached: {
      type: String,
    },
    valid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

PayrollVoucherSchema.index({ id: 1, organization: 1 }, { unique: true });

PayrollVoucherSchema.index({ organization: 1 });

module.exports = mongoose.model('PayrollVoucher', PayrollVoucherSchema);
