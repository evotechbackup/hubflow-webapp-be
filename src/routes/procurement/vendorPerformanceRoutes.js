const {
  getVendorAnalytics,
  getVendorReports,
} = require('../../controllers/procurement/vendorPerformanceController');

const router = require('express').Router();

router.get('/vendorreports/:orgid', getVendorReports);
router.post('/analytics/:orgid', getVendorAnalytics);

module.exports = router;
