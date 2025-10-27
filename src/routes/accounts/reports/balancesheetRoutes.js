const {
  createBalanceSheet,
  getBalanceSheetsByOrganization,
  getBalanceSheetById,
} = require('../../../controllers/accounts/reports/balancesheetController');
const router = require('express').Router();

router.post('/', createBalanceSheet);

router.get('/:orgid', getBalanceSheetsByOrganization);

router.get('/get-by-id/:id', getBalanceSheetById);

module.exports = router;
