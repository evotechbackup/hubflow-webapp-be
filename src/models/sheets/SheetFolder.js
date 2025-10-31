// StorageSchema.js

const mongoose = require('mongoose');

const SheetFolderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    agents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    path: {
      type: String,
      required: false,
    },
    notify: {
      type: Boolean,
      default: false,
    },
    agent: {
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

const SheetFolder = mongoose.model('SheetFolder', SheetFolderSchema);

module.exports = SheetFolder;
