const {
  createExpenseVoucher,
  updateExpenseVoucher,
  updateRevisedExpenseVoucher,
  getExpenseVoucherById,
  getExpenseVouchersByOrgId,
  approveExpenseVoucherStatus,
  rejectExpenseVoucher,
  invalidateExpenseVoucher,
  updateApproval,
  getFilteredExpenseVouchers,
  getExpenseData,
} = require('../../../controllers/accounts/vouchers/expenseVoucherController');

const router = require('express').Router();

router.post('/', createExpenseVoucher);

router.put('/:id', updateExpenseVoucher);

router.put('/revised/:id', updateRevisedExpenseVoucher);

router.get('/getexpenseslipbyid/:id', getExpenseVoucherById);

router.get('/getexpenses/:orgid', getExpenseVouchersByOrgId);

router.put('/expenseapprove/:id', approveExpenseVoucherStatus);

router.put('/expensereject/:id', rejectExpenseVoucher);

router.put('/invalidate/:id', invalidateExpenseVoucher);

router.put('/updateapproval/:id/:agentid', updateApproval);

router.get('/getexpenses/filterbydate/:orgid', getFilteredExpenseVouchers);

router.get('/getexpensedata/:orgid', getExpenseData);

module.exports = router;
