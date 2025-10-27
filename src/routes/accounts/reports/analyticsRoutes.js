const {
  getAnalytics,
} = require('../../../controllers/accounts/reports/analyticsController');
const router = require('express').Router();

router.post('/:orgid', getAnalytics);

module.exports = router;
