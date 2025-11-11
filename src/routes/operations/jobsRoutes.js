const {
  createJob,
  getJobs,
  getJobById,
  getJobByIdWithShipments,
  getJobsByCustomer,
} = require('../../controllers/operations/jobsController');

const express = require('express');
const router = express.Router();

router.post('/', createJob);

router.get('/all/:orgId', getJobs);

router.get('/:id', getJobById);
router.get('/:id/shipments', getJobByIdWithShipments);

router.get('/customer/:customerId', getJobsByCustomer);

module.exports = router;
