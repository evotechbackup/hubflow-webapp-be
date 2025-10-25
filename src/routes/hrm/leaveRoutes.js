const {
  createLeave,
  getAllLeave,
  getLeaveById,
  updateLeave,
  updateApproval,
  getLeaveByEmployeeId,
  getLeavesByMonth,
  getLeavesByMonthAndYear,
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

router.get('/month/:month', getLeavesByMonth);

router.get('/month/:month/:year', getLeavesByMonthAndYear);

router.put('/invalidate/:id', invalidateLeave);

router.put('/approval/:id', updateApproval);

router.delete('/delete/:id', deleteLeave);

router.get('/specific/:id', getSpecificLeaveById);

router.put('/approved-reject/:id', updateApprovedRejectLeave);

module.exports = router;
