const {
  createParentAccount,
  getAllParentAccounts,
  getParentAccountsByTypes,
  getParentAccountsByAccountTypes,
  getParentAccountById,
  addChildAccount,
  removeChildAccount,
  exportAccountsData,
} = require('../../controllers/accounts/parentaccountController');

const router = require('express').Router();

router.post('/', createParentAccount);
router.get('/all/:orgid', getAllParentAccounts);
router.get('/accounttype/:orgid', getParentAccountsByTypes);
router.get('/:orgid/:accountType', getParentAccountsByAccountTypes);
router.get('/get/account/:id', getParentAccountById);
router.put('/addchildaccount/:id/:childAccountId', addChildAccount);
router.put('/removechildaccount/:id/:childAccountId', removeChildAccount);
router.get('/excel/:orgid/:accountType', exportAccountsData);

module.exports = router;
