const {
  createGroupPayroll,
  updateGroupPayroll,
  approveGroupPayrollStatus,
  rejectGroupPayroll,
  updateGroupPayrollApproval,
  invalidateGroupPayroll,
  getGroupPayrollsByOrganization,
  getGroupPayrollsByMonth,
  getGroupPayrollById,
  getWorkingHoursByAttendanceAndTimesheet,
} = require('../../controllers/hrm/groupPayrollController');

const router = require('express').Router();

router.post('/', createGroupPayroll);

router.put('/:id', updateGroupPayroll);

router.post('/approvepayroll/:id', approveGroupPayrollStatus);

router.put('/rejectpayroll/:id', rejectGroupPayroll);

router.put('/updateapproval/:id', updateGroupPayrollApproval);

router.put('/invalidate/:id', invalidateGroupPayroll);

router.get('/get/:orgid', getGroupPayrollsByOrganization);

router.get('/getgrouppayrollsbymonth/:orgid/:month', getGroupPayrollsByMonth);

router.get('/getgrouppayrollbyid/:id', getGroupPayrollById);

router.post(
  '/get-working-hours-by-attendance-and-timesheet',
  getWorkingHoursByAttendanceAndTimesheet
);

module.exports = router;
