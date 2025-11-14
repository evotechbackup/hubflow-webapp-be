const mongoose = require('mongoose');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const ShipmentRoutingSchema = new Schema(
  {
    shipmentId: { type: ObjectId, ref: 'Shipment' },

    modeOfTransport: String,
    origin: String,
    etd: Date,
    atd: Date,
    destination: String,
    eta: Date,
    ata: Date,

    vesselName: String,
    status: {
      type: String,
      enum: ['planned', 'confirmed', 'intransit'],
    },
    transportStage: String,
    geoLocation: String,
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
ShipmentRoutingSchema.index({ organization: 1 });

module.exports = mongoose.model('ShipmentRouting', ShipmentRoutingSchema);
