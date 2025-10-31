const mongoose = require('mongoose');

const AreaMasterSchema = new mongoose.Schema(
  {
    areaCode: String,
    areaName: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    remarks: String,

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

AreaMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('AreaMaster', AreaMasterSchema);
