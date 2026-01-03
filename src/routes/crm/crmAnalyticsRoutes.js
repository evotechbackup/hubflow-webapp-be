const {
  getCrmAnalytics,
} = require('../../controllers/crm/crmAnalyticsController');
const { authenticate } = require('../../middleware');

const router = require('express').Router();

router.post('/:orgid', authenticate, getCrmAnalytics);

module.exports = router;
