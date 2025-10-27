const {
  createCashFlowStatement,
  getCashFlowStatementsByOrganization,
  getCashFlowStatementById,
} = require('../../../controllers/accounts/reports/cashflowstatementController');
const router = require('express').Router();

router.post('/', createCashFlowStatement);

router.get('/:orgid', getCashFlowStatementsByOrganization);

router.get('/get-by-id/:id', getCashFlowStatementById);

module.exports = router;
