const mongoose = require('mongoose');

const PackMasterSchema = new mongoose.Schema(
  {
    packCode: String,
    packName: String,
    ediCode: String,
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

PackMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('PackMaster', PackMasterSchema);
