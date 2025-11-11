const mongoose = require('mongoose');

const TabSchema = new mongoose.Schema(
  {
    file: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TemplateFile',
      required: true,
    },
    title: { type: String, required: true, default: '' },

    content: { type: String, default: '' },

    order: { type: Number, default: 0 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocsTamplate', TabSchema);
