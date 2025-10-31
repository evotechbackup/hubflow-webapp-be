const mongoose = require('mongoose');

const AddressMasterSchema = new mongoose.Schema(
  {
    addressCode: String,
    addressLine1: String,
    addressLine2: String,
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
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityMaster',
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

AddressMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('AddressMaster', AddressMasterSchema);
