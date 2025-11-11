const {
  createJob,
  getJobs,
  getJobById,
  getJobByIdWithShipments,
  getJobsByCustomer,
  getProductsByJobAndVendor,
  getShipmentDetailsByJob,
} = require('../../controllers/operations/jobsController');

const express = require('express');
const router = express.Router();

router.post('/', createJob);

router.get('/all/:orgId', getJobs);

router.get('/:id', getJobById);
router.get('/shipments/:id', getJobByIdWithShipments);
router.get('/shipments-with-details/:jobId', getShipmentDetailsByJob);

router.get('/customer/:customerId', getJobsByCustomer);
router.get('/job/:jobId/vendor/:vendorId', getProductsByJobAndVendor);

module.exports = router;
