const {
  createService,
  getAllServices,
  addService,
} = require('../../controllers/crm/crmServiceController');

const router = require('express').Router();

router.get('/:orgid', getAllServices);

router.post('/create', createService);

router.put('/add-service/:orgid', addService);

module.exports = router;
