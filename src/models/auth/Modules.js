const mongoose = require('mongoose');

const FeaturesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
  },
  { timestamps: true }
);

const ModulesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    features: [FeaturesSchema],
  },

  { timestamps: true }
);

module.exports = mongoose.model('Modules', ModulesSchema);
