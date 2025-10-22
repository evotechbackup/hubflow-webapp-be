const mongoose = require('mongoose');

const ZoneMasterSchema = new mongoose.Schema(
  {
    zoneCode: String,
    zoneName: String,
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

ZoneMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('ZoneMaster', ZoneMasterSchema);
