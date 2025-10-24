const {
  createAccount,
  addCategory,
  getAccountsForInvoicePaymentReceived,
  getReceivablesNPayables,
  getIncomeNExpenseAccounts,
  getTopIncomeExpenseLiability,
  getTopExpenseAccounts,
  monthlyCashFlowStatement,
  getAccountsForPCR,
  getAccountsForExpense,
  getAccountsForIncome,
  getAccountsForExpensePaidThrough,
  getAccountsForInventoryAdjustment,
  getAccountsByType,
  getAccountHierarchy,
  getStockAccounts,
  getStockAndFixedAssetAccounts,
  getAccounts,
  getAccountById,
  editAccount,
  updateCostCenter,
  changeActivation,
  deleteAccount,
  getParentAccounts,
  getAccountGroupedWithTypes,
  getCategories,
  getCategory,
  deleteFileFromCategory,
  updateFileInCategory,
  getFiles,
  getStatementOfAccountsForCustomerTransaction,
  getStatementOfAccountsForCustomer,
  getStatementOfAccountsForVendorTransaction,
  getStatementOfAccountsForVendor,
} = require('../../controllers/accounts/accountsController');

const router = require('express').Router();

router.post('/', createAccount);

router.post('/addcategory', addCategory);

router.get(
  '/getaccounts/accountsforinvoicepaymentreceived/:orgid',
  getAccountsForInvoicePaymentReceived
);

router.get('/getReceivablesNPayables/:orgid', getReceivablesNPayables);

router.get('/getIncomeNExpense/:orgid', getIncomeNExpenseAccounts);

router.get(
  '/getTopIncomeExpenseLiability/:orgid',
  getTopIncomeExpenseLiability
);

router.get('/getTopExpenseAccounts/:orgid', getTopExpenseAccounts);

router.get('/monthly-cfstatement/:orgid', monthlyCashFlowStatement);

router.get('/getaccounts/accountsforpcr/:orgid', getAccountsForPCR);

router.get('/getaccounts/accountsforexpense/:orgid', getAccountsForExpense);

router.get('/getaccounts/accountsforincome/:orgid', getAccountsForIncome);

router.get(
  '/getaccounts/accountsforexpensepaidthrough/:orgid',
  getAccountsForExpensePaidThrough
);

router.get(
  '/getaccounts/accountsforinventoryadjustment/:orgid',
  getAccountsForInventoryAdjustment
);

router.get('/getaccounts/:orgid/:accountType', getAccountsByType);

router.get('/getaccountshierarchy/:orgid/:filter?', getAccountHierarchy);

router.get('/getstockaccounts/:orgid', getStockAccounts);

router.get(
  '/getstocknfixedassetsaccounts/:orgid',
  getStockAndFixedAssetAccounts
);

router.get('/getaccounts/:orgid', getAccounts);

router.get('/getaccountbyid/:id', getAccountById);

router.put('/editaccountbyid/:id', editAccount);

router.put('/updatecostcenter/:id', updateCostCenter);

router.put('/changeactivation/:id', changeActivation);

router.delete('/:id', deleteAccount);

router.get('/parentaccounts/:orgid', getParentAccounts);

router.get('/accountgroupedwithtypes/:orgid', getAccountGroupedWithTypes);

router.get('/getcategoryofaccounts/:orgid', getCategories);

router.get('/category/:id', getCategory);

router.delete('/files/:id/:documentId', deleteFileFromCategory);

router.put('/files/:id/:documentId', updateFileInCategory);

router.get('/files/:id', getFiles);

router.get(
  '/statementofaccounts/customertransaction/:customerid/:orgid',
  getStatementOfAccountsForCustomerTransaction
);

router.get(
  '/statementofaccounts/customer/:customerid/:orgid',
  getStatementOfAccountsForCustomer
);

router.get(
  '/statementofaccounts/vendortransaction/:vendorid/:orgid',
  getStatementOfAccountsForVendorTransaction
);

router.get(
  '/statementofaccounts/vendor/:vendorid/:orgid',
  getStatementOfAccountsForVendor
);

module.exports = router;
