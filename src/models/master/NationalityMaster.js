const mongoose = require('mongoose');

const NationalityMasterSchema = new mongoose.Schema(
  {
    nationalityCode: String,
    nationalityName: String,
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

NationalityMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('NationalityMaster', NationalityMasterSchema);
