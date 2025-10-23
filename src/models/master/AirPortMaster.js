const mongoose = require('mongoose');

const AirPortMasterSchema = new mongoose.Schema(
  {
    airPortCode: String,
    airPortName: String,
    ediCode: String,
    blNumber: Number,
    iataCode: String,
    isoCode: String,
    blNoPrefix: String,
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CountryMaster',
      required: false,
    },
    region: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RegionMaster',
      required: false,
    },
    zone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ZoneMaster',
      required: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    type: {
      type: String,
      enum: ['air', 'land', 'sea'],
      default: 'air',
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

AirPortMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('AirPortMaster', AirPortMasterSchema);
