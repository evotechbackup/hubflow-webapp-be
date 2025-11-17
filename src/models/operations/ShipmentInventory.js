const mongoose = require('mongoose');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const ShipmentInventorySchema = new Schema(
  {
    shipmentId: { type: ObjectId, ref: 'Shipment' },

    stockInOrOut: {
      type: String,
      enum: ['in', 'out'],
      default: 'in',
    },
    date: { type: Date, default: Date.now },
    asset: String,
    quantity: String,
    currency: String,
    amount: Number,
    receivedFrom: String,
    remarks: String,

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
ShipmentInventorySchema.index({ organization: 1 });

module.exports = mongoose.model('ShipmentInventory', ShipmentInventorySchema);
