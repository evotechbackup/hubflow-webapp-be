const {
  createOpeningBalance,
  updateOpeningBalance,
  getOpeningBalances,
  getOpeningBalanceById,
} = require('../../controllers/accounts/openingBalanceController');

const router = require('express').Router();

router.post('/create', createOpeningBalance);

router.put('/update/:orgid', updateOpeningBalance);

router.get('/get/:orgid', getOpeningBalances);

router.get('/get/openingbalancebyid/:orgid', getOpeningBalanceById);

module.exports = router;
