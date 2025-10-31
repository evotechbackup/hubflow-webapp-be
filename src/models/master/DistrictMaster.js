const mongoose = require('mongoose');

const DistrictMasterSchema = new mongoose.Schema(
  {
    districtCode: String,
    districtName: String,
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

DistrictMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('DistrictMaster', DistrictMasterSchema);
