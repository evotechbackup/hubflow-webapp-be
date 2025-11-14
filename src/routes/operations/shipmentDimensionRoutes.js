const {
  createDimension,
  updateDimension,
  getDimensionsByShipment,
  getDimensionsByJob,
  deleteDimension,
} = require('../../controllers/operations/shipmentDimensionController');

const express = require('express');
const router = express.Router();

router.post('/', createDimension);
router.put('/:id', updateDimension);
router.get('/shipment/:id', getDimensionsByShipment);
router.get('/job/:id', getDimensionsByJob);
router.delete('/:id', deleteDimension);

module.exports = router;
