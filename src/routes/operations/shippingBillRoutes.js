const {
  createShippingBill,
  updateShippingBill,
  getShippingBillsByShipment,
  getShippingBillsByJob,
  deleteShippingBill,
} = require('../../controllers/operations/shippingBillController');

const express = require('express');
const router = express.Router();

router.post('/', createShippingBill);
router.put('/:id', updateShippingBill);
router.get('/shipment/:id', getShippingBillsByShipment);
router.get('/job/:id', getShippingBillsByJob);
router.delete('/:id', deleteShippingBill);

module.exports = router;
