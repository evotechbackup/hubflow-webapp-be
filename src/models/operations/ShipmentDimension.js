const mongoose = require('mongoose');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const ShipmentDimensionSchema = new Schema(
  {
    shipmentId: { type: ObjectId, ref: 'Shipment' },

    unit: String,
    cbmCalcMethod: {
      type: String,
      enum: ['diameter', 'lbh'],
    },
    length: Number,
    width: Number,
    height: Number,
    cylinderRadius: Number,

    numberOfPackages: Number,
    package: String,
    grossWeight: Number,
    grossWeightUnit: String,
    volumeWeight: Number,
    volumeWeightUnit: String,
    netWeight: Number,
    netWeightUnit: String,
    volume: Number,
    totalWeight: Number,
    totalWeightUnit: String,
    hsCode: String,
    packageType: String,
    commodityDescription: String,
    coo: String,
    totalInnerQuantity: Number,

    quantityCurrency: String,
    goodsValue: Number,
    totalValue: Number,

    containerType: String,
    containerNo: String,
    containerRemarks: String,

    company: { type: ObjectId, ref: 'Company' },
    organization: { type: ObjectId, ref: 'Organization' },
    user: { type: ObjectId, ref: 'User' },
    valid: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Optimize queries by converting to plain JS objects when not modifying
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ShipmentDimensionSchema.index({ organization: 1 });

module.exports = mongoose.model('ShipmentDimension', ShipmentDimensionSchema);
