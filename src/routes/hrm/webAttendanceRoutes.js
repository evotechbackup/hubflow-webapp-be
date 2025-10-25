const {
  createWebAttendance,
  createBulkWebAttendance,
  getTodaysAttendance,
  getAllAttendance,
  getEmployeeAttendance,
  getEmployeeAttendanceCount,
  getEmployeeWorkingHours,
  getEmployeeWorkingHoursByDate,
  getAttendanceByDate,
  getEmployeeAttendanceList,
  getEmployeeAttendanceMonthly,
  getEmployeeAttendancesMonthly,
  getEmployeeAttendanceByDate,
} = require('../../controllers/hrm/webAttendanceController');

const router = require('express').Router();

router.get('/all/:orgid', getAllAttendance);

router.post('/create', createWebAttendance);

router.post('/createBulk', createBulkWebAttendance);

router.get('/todays', getTodaysAttendance);

router.get('/:employeeId', getEmployeeAttendance);

router.get('/attendance/employee/:employeeId', getEmployeeAttendanceCount);

router.get('/workingHours/:employeeId', getEmployeeWorkingHours);

router.post('/workingHoursByDate', getEmployeeWorkingHoursByDate);

router.post('/attendancebydate', getAttendanceByDate);

router.get('/attendanceList/:orgid', getEmployeeAttendanceList);

router.get('/attendance/monthly/:orgid', getEmployeeAttendanceMonthly);

router.get('/attendance/monthly/:month/:orgid', getEmployeeAttendancesMonthly);

router.get('/attendance/bydate/:date/:orgid', getEmployeeAttendanceByDate);

module.exports = router;
