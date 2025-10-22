const mongoose = require('mongoose');

const CommodityMasterSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    type: {
      type: String,
      enum: ['group', 'item'],
      default: 'group',
    },
    hazardous: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no',
    },
    perishable: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no',
    },
    flammable: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no',
    },
    timber: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no',
    },
    reeferMinTemperature: Number,
    maximumTemperature: Number,
    containerVentilation: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no',
    },
    nmfcClass: String,
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

CommodityMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CommodityMaster', CommodityMasterSchema);
