const mongoose = require('mongoose');

const TabSchema = new mongoose.Schema(
  {
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocsFile',
      required: true,
    },

    title: { type: String, required: true, default: 'Untitled Tab' },

    content: { type: String, default: '' },

    order: { type: Number, default: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tab', TabSchema);
