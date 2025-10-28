const mongoose = require('mongoose');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const PCCVoucherSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: '',
      required: true,
    },
    pccId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PCC',
    },
    date: {
      type: Date,
      default: new Date(),
    },
    pccAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    amount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
    },
    paidTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    employeeName: {
      type: String,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    notes: {
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
    approvalComment: {
      type: String,
    },
    valid: {
      type: Boolean,
      default: true,
    },
    paymentMode: {
      type: String,
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
  },
  { timestamps: true }
);

PCCVoucherSchema.index({ id: 1, organization: 1 }, { unique: true });

PCCVoucherSchema.index({ organization: 1 });

module.exports = mongoose.model('PCCVoucher', PCCVoucherSchema);
