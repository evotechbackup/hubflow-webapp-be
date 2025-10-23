const {
  createJob,
  getJobs,
  getJobById,
} = require('../../controllers/operations/jobsController');

const express = require('express');
const router = express.Router();

router.post('/', createJob);

router.get('/all/:orgId', getJobs);

router.get('/:id', getJobById);

module.exports = router;
