const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
    },
    description: {
      type: String,
    },
    thumbnail: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
    },
    sku: {
      type: String,
    },
    unit: {
      type: String,
    },
    workFlows: [
      {
        type: String,
      },
    ],
    media: [
      {
        type: String,
      },
    ],
    quantity: {
      type: Number,
      default: 1,
    },
    tags: [
      {
        type: String,
      },
    ],
    costPrice: String,
    salesAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    purchaseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    files: [
      {
        name: {
          type: String,
          default: '',
        },
        filename: {
          type: String,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
        },
        notify: {
          type: Boolean,
          default: false,
        },
        expiryDate: {
          type: Date,
        },
        reminderDate: {
          type: Date,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
