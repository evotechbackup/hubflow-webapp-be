const {
  createShipment,
  getShipmentById,
} = require('../../controllers/operations/shipmentController');

const express = require('express');
const router = express.Router();

router.post('/', createShipment);
router.get('/:id', getShipmentById);

module.exports = router;
