const {
  createLeave,
  getAllLeave,
  getLeaveById,
  updateLeave,
  updateApproval,
  getLeaveByEmployeeId,
  getLeavesByMonth,
  getLeavesByMonths,
  invalidateLeave,
  deleteLeave,
  getSpecificLeaveById,
  updateApprovedRejectLeave,
} = require('../../controllers/hrm/leaveControlller');

const router = require('express').Router();

router.get('/all/:orgid', getAllLeave);

router.post('/create', createLeave);

router.put('/update/:id', updateLeave);

router.get('/:id', getLeaveById);

router.get('/employee/:employeeId', getLeaveByEmployeeId);

router.get('/leavesbymonth/:orgid', getLeavesByMonth);

router.get('/getleavesbymonth/:orgid/:month', getLeavesByMonths);

router.put('/invalidate/:id', invalidateLeave);

router.put('/approval/:id/:userid', updateApproval);

router.delete('/delete/:id', deleteLeave);

router.get('/specific/:id', getSpecificLeaveById);

router.put('/approved-reject/:id', updateApprovedRejectLeave);

module.exports = router;
