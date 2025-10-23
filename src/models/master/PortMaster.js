const mongoose = require('mongoose');

const PortMasterSchema = new mongoose.Schema(
  {
    portCode: String,
    portName: String,
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
    type: {
      type: String,
      enum: ['air', 'land', 'sea'],
      default: 'sea',
    },
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

PortMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('PortMaster', PortMasterSchema);
