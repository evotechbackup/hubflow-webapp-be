const {
  createPayroll,
  createLoan,
  updateloan,
  invalidatepayroll,
  multiplePayrollApprove,
  updatePayroll,
  payrollapprove,
  payrollrejected,
  updateapproval,
  getpayrolls,
  getpayrollById,
  getpayrollslipbyid,
  getadvanceloansbymonth,
  getpayrollbymonth,
  getpayrollbyemployee,
  getadvanceloansbymonthType,
  getemployeeledgerbypayroll,
  getworkinghoursbyattendanceandtimesheet,
  getemployeeledgerbymonth,
  getbulkemployeeledgerbymonth,
  deletePayroll,
} = require('../../controllers/hrm/payrollController');

const router = require('express').Router();

router.get('/all/:orgid', getpayrolls);
router.get('/payrollbyid/:id', getpayrollById);
router.get('/slip/:id', getpayrollslipbyid);
router.get('/byemployee/:empid', getpayrollbyemployee);
router.get('/bymonth/:orgid', getpayrollbymonth);
router.get('/advanceloans/:orgid/:type', getadvanceloansbymonth);
router.get('/getpayrollbymonth/:orgid/:month', getpayrollbymonth);
router.get(
  '/getadvanceloansbymonth/:orgid/:month/:type',
  getadvanceloansbymonthType
);
router.get(
  '/getemployeeledgerbypayroll/:payrollId',
  getemployeeledgerbypayroll
);
router.get('/getemployeeledgerbymonth/:empid/:month', getemployeeledgerbymonth);

router.post('/createpayroll', createPayroll);
router.post('/createloan', createLoan);
router.post(
  '/working-hours-by-attendance-and-timesheet/:empid',
  getworkinghoursbyattendanceandtimesheet
);
router.post('/getbulkemployeeledgerbymonth', getbulkemployeeledgerbymonth);

router.put('/updateloan/:payrollId', updateloan);
router.put('/update/:payrollId', updatePayroll);
router.put('/approve/:id', payrollapprove);
router.put('/reject/:id', payrollrejected);
router.put('/updateapproval/:id/:userid', updateapproval);
router.put('/multiplepayrollapprove', multiplePayrollApprove);
router.put('/updatePayroll/:payrollId', updatePayroll);
router.put('/invalidatepayroll/:id', invalidatepayroll);

router.delete('/delete/:id', deletePayroll);
module.exports = router;
