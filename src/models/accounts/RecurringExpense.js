const mongoose = require('mongoose');

const RecurringExpenseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: '',
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
    paymentMode: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RecurringExpense', RecurringExpenseSchema);
