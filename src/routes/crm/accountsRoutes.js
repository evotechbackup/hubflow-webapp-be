const {
  createAccount,
  getAccounts,
  updateAccountName,
  updateAccount,
  deleteAccount,
  getAccountById,
} = require('../../controllers/crm/accountsController');

const router = require('express').Router();

router.get('/:orgid', getAccounts);

router.get('/getaccountbyid/:id', getAccountById);

router.post('/create', createAccount);

router.put('/:id', updateAccount);

router.put('/updatename/:id', updateAccountName);

router.delete('/:id', deleteAccount);

module.exports = router;
