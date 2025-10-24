const mongoose = require('mongoose');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const ExpenseSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      default: 0,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    reference: {
      type: String,
    },
    notes: {
      type: String,
    },
    expenses: [
      {
        item: {
          type: String,
        },
        unit: {
          type: String,
        },
        quantity: {
          type: Number,
        },
        price: {
          type: Number,
        },
        amount: {
          type: Number,
        },
        tax: {
          type: Number,
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'rejected', 'fulfilled'],
      default: 'pending',
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
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
    user: {
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
    priorityStatus: {
      type: String,
      enum: ['flexible', 'medium', 'important'],
      default: 'flexible',
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    paymentMode: {
      type: String,
    },
    valid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

ExpenseSchema.index({ id: 1, organization: 1 }, { unique: true });

ExpenseSchema.index({ organization: 1 });

module.exports = mongoose.model('Expense', ExpenseSchema);
