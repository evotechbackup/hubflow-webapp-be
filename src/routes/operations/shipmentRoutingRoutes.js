const {
  createRouting,
  updateRouting,
  getRoutingsByShipment,
  getRoutingsByJob,
  deleteRouting,
} = require('../../controllers/operations/shipmentRoutingController');

const express = require('express');
const router = express.Router();

router.post('/', createRouting);
router.put('/:id', updateRouting);
router.get('/shipment/:id', getRoutingsByShipment);
router.get('/job/:id', getRoutingsByJob);
router.delete('/:id', deleteRouting);

module.exports = router;
