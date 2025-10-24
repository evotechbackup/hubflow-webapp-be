const mongoose = require('mongoose');

const costMasterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
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

costMasterSchema.index({ organization: 1, isDeleted: 1 });

module.exports = mongoose.model('CostMaster', costMasterSchema);
