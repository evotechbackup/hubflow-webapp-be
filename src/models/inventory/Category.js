const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ['goods'],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model('Category', CategorySchema);
