const {
  createLeaveType,
  getAllLeaveType,
  getLeaveById,
  updateLeaveType,
  getLeaveTypeByDepartmentId,
  addLeaveTypeToOrganization,
  getLeaveTypesByOrganizationId,
  invalidateLeaveType,
} = require('../../controllers/hrm/leaveTypeController');

const router = require('express').Router();

router.get('/all/:orgid', getAllLeaveType);

router.post('/create', createLeaveType);

router.put('/update/:id', updateLeaveType);

router.get('/:id', getLeaveById);

router.get('/organization/:orgid', getLeaveTypesByOrganizationId);

router.get(
  '/leavetypesbydeptid/:orgid/:departmentId',
  getLeaveTypeByDepartmentId
);

router.post('/addleavetype/:orgid', addLeaveTypeToOrganization);

router.delete('/invalidate/:id', invalidateLeaveType);

module.exports = router;
