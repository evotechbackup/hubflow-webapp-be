const mongoose = require('mongoose');

const VesselMasterSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    vesselId: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    type: String,
    builtOnYear: String,
    imoNumber: String,
    size: String,
    draught: String,
    draughtWeight: String,
    grossTonnage: String,
    netTonnage: String,
    owner: String,
    manager: String,
    placeOfBuild: String,
    builder: String,
    callsign: String,
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

VesselMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('VesselMaster', VesselMasterSchema);
