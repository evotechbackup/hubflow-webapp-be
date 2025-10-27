const {
  createProfitNLoss,
  getProfitNLossesByOrganization,
  getProfitNLossById,
} = require('../../../controllers/accounts/reports/profitnlossController');
const router = require('express').Router();

router.post('/', createProfitNLoss);

router.get('/:orgid', getProfitNLossesByOrganization);

router.get('/get-by-id/:id', getProfitNLossById);

module.exports = router;
