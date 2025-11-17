const {
  createShipment,
  getShipmentById,
  updateShipment,
  addActivity,
  updateExchangeRate,
} = require('../../controllers/operations/shipmentController');

const express = require('express');
const router = express.Router();

router.post('/', createShipment);
router.put('/:id', updateShipment);
router.put('/add-activity/:id', addActivity);
router.put('/update-exchange-rate/:id', updateExchangeRate);
router.get('/:id', getShipmentById);

module.exports = router;
