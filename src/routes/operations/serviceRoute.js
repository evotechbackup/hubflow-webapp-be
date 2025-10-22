const {
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService,
} = require('../../controllers/operations/serviceController');

const router = require('express').Router();

router.get('/all/:orgid', getAllServices);

router.get('/:id', getService);

router.post('/create', createService);

router.put('/update/:id', updateService);

router.delete('/delete/:id', deleteService);

module.exports = router;
