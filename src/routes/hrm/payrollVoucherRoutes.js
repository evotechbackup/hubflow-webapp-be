const {
  createPayrollVoucher,
  updatePayrollVoucher,
  voucherApprove,
  voucherReject,
  updateApproval,
  invalidatePayrollVoucher,
  getPayrollVouchers,
  getPayrollVoucherById,
  getPayrollSlipById,
  getPayrollVoucherByEmployee,
  getAdvanceByEmployee,
  getLoanByEmployee,
  getMultiplePayrollsByMonth,
  getPayrollByMonth,
  getAllPayrollByMonth,
  getAdvanceLoansByMonth,
  getPayrollsByMonth,
  getAllPayrollsByMonth,
  getMultipleTypePayrollVouchers,
  getAdvanceLoansByMonthAndType,
  getEmployeeLedgerByPayroll,
} = require('../../controllers/hrm/payrollVoucherController');
const router = require('express').Router();

router.post('/', createPayrollVoucher);

router.put('/:id', updatePayrollVoucher);

router.put('/voucherapprove/:id', voucherApprove);

router.put('/voucherreject/:id', voucherReject);

router.put('/updateapproval/:id/:agentid', updateApproval);

router.put('/invalidate/:id', invalidatePayrollVoucher);

router.get('/getpayroll/:orgid', getPayrollVouchers);

router.get('/getpayrollvoucherbyid/:id', getPayrollVoucherById);

router.get('/getpayrollslipbyid/:id', getPayrollSlipById);

router.post('/getpayrollbyemployee/:month', getPayrollVoucherByEmployee);

router.get('/getadvancebyemployee/:month/:empid', getAdvanceByEmployee);

router.get('/getloanbyemployee/:month/:empid', getLoanByEmployee);

router.get(
  '/getmultiplepayrollsbymonth/:orgid/:month',
  getMultiplePayrollsByMonth
);

router.get('/getpayrollbymonth/:orgid', getPayrollByMonth);

router.get('/getallpayrollbymonth/:orgid', getAllPayrollByMonth);

router.get('/getadvanceloansbymonth/:orgid/:type', getAdvanceLoansByMonth);

router.get('/getpayrollbymonth/:orgid/:month', getPayrollsByMonth);

router.get('/getallpayrollbymonth/:orgid/:month', getAllPayrollsByMonth);

router.get(
  '/getmultipletypepayrollvouchers/:orgid/:type',
  getMultipleTypePayrollVouchers
);

router.get(
  '/getadvanceloansbymonth/:orgid/:month/:type',
  getAdvanceLoansByMonthAndType
);

router.get(
  '/getemployeeledgerbypayroll/:payrollid',
  getEmployeeLedgerByPayroll
);

module.exports = router;
