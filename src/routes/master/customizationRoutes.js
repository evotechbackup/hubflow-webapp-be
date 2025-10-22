const {
  getCustomization,
  createCustomization,
  updateCustomization,
  deleteCustomization,
} = require('../../controllers/master/customizationController');

const router = require('express').Router();

router.get('/:orgid', getCustomization);

router.post('/create', createCustomization);

router.put('/update/:id', updateCustomization);

router.delete('/delete/:organization/:type/:id', deleteCustomization);

module.exports = router;
