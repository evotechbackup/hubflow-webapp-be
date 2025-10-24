const mongoose = require('mongoose');

const ParentAccountSchema = new mongoose.Schema(
  {
    accountType: {
      type: String,
      enum: [
        'currentasset',
        'fixedasset',
        'stock',
        'cashandbank',
        'othercurrentasset',
        'currentliability',
        'longtermliability',
        'othercurrentliability',
        'ownersequity',
        'income',
        'otherincome',
        'indirectincome',
        'expense',
        'costofgoodssold',
        'otherexpense',
        'indirectexpense',
      ],
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    accountCode: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    description: {
      type: String,
    },
    amount: {
      type: Number,
      default: 0,
    },
    fixed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: Boolean,
      default: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    childAccounts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ParentAccount', ParentAccountSchema);
