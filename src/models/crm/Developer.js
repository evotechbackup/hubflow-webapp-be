const mongoose = require('mongoose');

// Builders for properties
const DeveloperSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      min: 3,
      max: 20,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    phoneNo: {
      type: String,
      default: '',
    },
    email: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CRMProperties',
      },
    ],
    notes: [
      {
        text: {
          type: String,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Developer', DeveloperSchema);
