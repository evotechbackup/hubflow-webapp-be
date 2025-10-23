const mongoose = require('mongoose');

const ContainerTypeMasterSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    typecode: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    size: Number,
    interiorWidthInMeter: Number,
    interiorHeightInMeter: Number,
    interiorLengthInMeter: Number,
    noOfTeu: String,
    isHighCube: String,
    volumnInCBM: String,
    isoCode: String,
    grossWeightInKg: String,
    grossWeightInLb: String,
    tareWeightInKg: String,
    tareWeightInLb: String,
    payloadWeightInKg: String,
    payloadWeightInLb: String,
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

ContainerTypeMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model(
  'ContainerTypeMaster',
  ContainerTypeMasterSchema
);
