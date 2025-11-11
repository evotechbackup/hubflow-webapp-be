// StorageSchema.js

const mongoose = require('mongoose');

const storageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['file', 'folder'],
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
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
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
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

const Storage = mongoose.model('Storage', storageSchema);

module.exports = Storage;
