const mongoose = require('mongoose');

const OpeningBalanceSchema = new mongoose.Schema(
  {
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
    ],

    records: [
      {
        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account',
        },
        debit: {
          type: Number,
        },
        credit: {
          type: Number,
        },
      },
    ],

    date: {
      type: Date,
      required: true,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OpeningBalance', OpeningBalanceSchema);
