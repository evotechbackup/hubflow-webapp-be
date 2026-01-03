const {
  getPerformance,
} = require('../../controllers/reports/crmPerformanceController');
const { authenticate } = require('../../middleware');

const router = require('express').Router();

router.get('/crm-performance/:orgid', authenticate, getPerformance);

module.exports = router;
