const {
  createExpense,
  updateExpense,
  revisedExpense,
  getExpenseById,
  getExpenses,
  putApproveExpense,
  rejectExpense,
  invalidateExpense,
  updateApproval,
  getFilteredExpenses,
  checkExistId,
  uploadFile,
} = require('../../controllers/accounts/expenseController');

const router = require('express').Router();

router.post('/', createExpense);

router.put('/:id', updateExpense);

router.put('/revised/:id', revisedExpense);

router.get('/getexpenseslipbyid/:id', getExpenseById);

router.get('/getexpenses/:orgid', getExpenses);

router.put('/expenseapprove/:id', putApproveExpense);

router.put('/expensereject/:id', rejectExpense);

router.put('/invalidate/:id', invalidateExpense);

router.put('/updateapproval/:id', updateApproval);

router.get('/getexpenses/filterbydate/:orgid', getFilteredExpenses);

router.get('/checkExistId/:orgid', checkExistId);

router.post('/uploadFile/:orgid', uploadFile);

module.exports = router;
