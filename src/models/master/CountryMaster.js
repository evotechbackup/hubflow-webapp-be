const mongoose = require('mongoose');

const CountryMasterSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    shortName: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    region: String,
    awbCurrency: String,
    localCurrency: String,
    dialingCode: String,
    isoAlpha3Code: String,
    isoUNM49Code: String,
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

CountryMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CountryMaster', CountryMasterSchema);
