const mongoose = require('mongoose');

const CurrencyMasterSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    decimalPlaces: Number,
    numberToBasic: Number,
    shortName: String,
    symbol: String,
    prefix: String,
    suffix: String,
    icon: String,
    ediCode: String,
    languagePrefix: String,
    languageSuffix: String,
    languagePrefixAddon: String,
    languageSuffixAddon: String,
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

CurrencyMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CurrencyMaster', CurrencyMasterSchema);
