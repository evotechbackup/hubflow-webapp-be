const mongoose = require('mongoose');

const FeaturesModulesSchema = new mongoose.Schema(
  {
    features: [
      {
        type: String,
      },
    ],
    company: {
      type: mongoose.Types.ObjectId,
      ref: 'Company',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeaturesModules', FeaturesModulesSchema);
