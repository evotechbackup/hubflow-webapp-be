const {
  createInventory,
  updateInventory,
  getInventoryByShipment,
  getInventoryByJob,
  deleteInventory,
} = require('../../controllers/operations/shipmentInventoryController');

const express = require('express');
const router = express.Router();

router.post('/', createInventory);
router.put('/:id', updateInventory);
router.get('/shipment/:id', getInventoryByShipment);
router.get('/job/:id', getInventoryByJob);
router.delete('/:id', deleteInventory);

module.exports = router;
