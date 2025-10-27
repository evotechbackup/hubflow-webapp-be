const {
  createTrialBalance,
  getTrialBalancesByOrganization,
  getTrialBalanceById,
} = require('../../../controllers/accounts/reports/trialbalanceController');
const router = require('express').Router();

router.post('/', createTrialBalance);

router.get('/:orgid', getTrialBalancesByOrganization);

router.get('/get-by-id/:id', getTrialBalanceById);

module.exports = router;
