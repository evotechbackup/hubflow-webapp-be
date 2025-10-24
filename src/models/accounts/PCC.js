const mongoose = require('mongoose');
const { APPROVAL_STATUSES } = require('../../utils/constants');

// Petty Cash Closing

const PCCSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: '',
      required: true,
    },
    // order: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'ProjectOrder',
    // },
    pcrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PCR',
    },
    date: {
      type: Date,
      default: new Date(),
    },
    amount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      default: 0,
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
    status: {
      type: String,
      enum: ['pending', 'rejected', 'fulfilled'],
      default: 'pending',
    },
    approval: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'pending',
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
    user: {
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
    priorityStatus: {
      type: String,
      enum: ['flexible', 'medium', 'important'],
      default: 'flexible',
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PCCSchema.index({ id: 1, organization: 1 }, { unique: true });

PCCSchema.index({ organization: 1 });

module.exports = mongoose.model('PCC', PCCSchema);
