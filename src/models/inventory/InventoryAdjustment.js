const mongoose = require('mongoose');

const InventoryAdjustmentSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: ['quantity', 'value'],
    },
    referenceNo: {
      type: String,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    reason: {
      type: String,
    },
    description: {
      type: String,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: {
          type: Number,
          default: 0,
        },
        newQuantity: {
          type: Number,
          default: 0,
        },
        value: {
          type: Number,
          default: 0,
        },
        newValue: {
          type: Number,
          default: 0,
        },
        adjustedValue: {
          type: Number,
          default: 0,
        },
      },
    ],
    status: {
      type: String,
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'InventoryAdjustment',
  InventoryAdjustmentSchema
);
