const {
  createJob,
  getJobs,
  getJobById,
  getJobByIdWithShipments,
  getJobsByCustomer,
  getProductsByJobAndVendor,
  getProductsByJobAndVendorForPurchaseInvoice,
  getShipmentDetailsByJob,
  updateJob,
  getUniqueVendorsByJob,
  changeJobStatus,
} = require('../../controllers/operations/jobsController');

const express = require('express');
const router = express.Router();

router.post('/', createJob);

router.put('/:id', updateJob);
router.put('/status/:id', changeJobStatus);

router.get('/all/:orgId', getJobs);

router.get('/:id', getJobById);
router.get('/shipments/:id', getJobByIdWithShipments);
router.get('/shipments-with-details/:jobId', getShipmentDetailsByJob);

router.get('/customer/:customerId', getJobsByCustomer);
router.get('/job/:jobId/vendor/:vendorId', getProductsByJobAndVendor);
router.get(
  '/bills/job/:jobId/vendor/:vendorId',
  getProductsByJobAndVendorForPurchaseInvoice
);
router.get('/unique-vendors/:id', getUniqueVendorsByJob);

module.exports = router;
