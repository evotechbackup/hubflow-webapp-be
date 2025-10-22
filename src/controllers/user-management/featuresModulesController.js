const { asyncHandler } = require('../../middleware/errorHandler');
const Company = require('../../models/auth/Company');
const FeaturesModules = require('../../models/auth/FeaturesModules');
const { ValidationError } = require('../../utils/errors');

const updateFeaturesModules = asyncHandler(async (req, res) => {
  const { features } = req.body;
  if (!features) {
    throw new ValidationError('features are required');
  }

  await FeaturesModules.findOneAndUpdate(
    { company: req.company },
    { features },
    { new: true, upsert: true }
  );

  res.status(200).json({
    success: true,
    message: 'Features updated successfully',
  });
});

const getFeaturesModules = asyncHandler(async (req, res) => {
  let features = await FeaturesModules.findOne({
    company: req.company,
  });

  if (!features) {
    const company = await Company.findById(req.company).populate(
      'activeModules'
    );

    const featuresArray = [];

    company.activeModules.forEach((module) => {
      module.features.forEach((feature) => {
        featuresArray.push(feature.name);
      });
    });

    const newFeatureModule = new FeaturesModules({
      company: req.company,
      features: featuresArray,
    });
    features = await newFeatureModule.save();
  }

  res.status(200).json({
    success: true,
    data: features?.features || [],
  });
});

module.exports = { updateFeaturesModules, getFeaturesModules };
