const {
  getTransactions,
  getTransactionsByProductId,
  getTransactionsByServiceId,
  getTransactionsByFleetId,
} = require('../../controllers/accounts/transactionController');

const router = require('express').Router();

router.get('/:accountid', getTransactions);

// transaction by product Id
router.get('/product/:productid', getTransactionsByProductId);

// transaction by product Id
router.get('/service/:id', getTransactionsByServiceId);

// transaction by fleet id
router.get('/fleet/:fleetid', getTransactionsByFleetId);

module.exports = router;
