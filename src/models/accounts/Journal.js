const mongoose = require('mongoose');

const JournalSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      default: new Date(),
    },
    reference: {
      type: String,
    },
    notes: {
      type: String,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    items: [
      {
        accountId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account',
        },
        description: {
          type: String,
        },
        debit: {
          type: Number,
          default: 0,
        },
        credit: {
          type: Number,
          default: 0,
        },
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
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
    ],
  },
  { timestamps: true }
);

JournalSchema.index({ id: 1, organization: 1 }, { unique: true });

JournalSchema.index({ organization: 1 });

module.exports = mongoose.model('Journal', JournalSchema);
