const mongoose = require('mongoose');

const RegionMasterSchema = new mongoose.Schema(
  {
    regionCode: String,
    regionName: String,
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

RegionMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('RegionMaster', RegionMasterSchema);
