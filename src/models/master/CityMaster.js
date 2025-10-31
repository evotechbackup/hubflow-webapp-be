const mongoose = require('mongoose');

const CityMasterSchema = new mongoose.Schema(
  {
    cityCode: String,
    cityName: String,
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

CityMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CityMaster', CityMasterSchema);
