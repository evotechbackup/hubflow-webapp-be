// StorageSchema.js

const mongoose = require('mongoose');

const DocsFolderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: false,
    },
    notify: {
      type: Boolean,
      default: false,
    },
    agents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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

const DocsFolder = mongoose.model('DocsFolder', DocsFolderSchema);

module.exports = DocsFolder;
