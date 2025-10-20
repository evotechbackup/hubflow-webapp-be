const {
  updateFeaturesModules,
  getFeaturesModules,
} = require('../../controllers/user-management/featuresModulesController');

const router = require('express').Router();

router.put('/', updateFeaturesModules);
router.get('/', getFeaturesModules);

module.exports = router;
