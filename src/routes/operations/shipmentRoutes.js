const {
  createShipment,
  getShipmentById,
  updateShipment,
  addActivity,
} = require('../../controllers/operations/shipmentController');

const express = require('express');
const router = express.Router();

router.post('/', createShipment);
router.put('/:id', updateShipment);
router.put('/add-activity/:id', addActivity);
router.get('/:id', getShipmentById);

module.exports = router;
