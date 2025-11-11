const mongoose = require('mongoose');

const FleetCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ['equipment', 'vehicle'],
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

FleetCategorySchema.index({ organization: 1, company: 1 });

module.exports = mongoose.model('FleetCategory', FleetCategorySchema);
