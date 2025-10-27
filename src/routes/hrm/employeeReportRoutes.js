const {
  getAllEmployeeReports,
  createEmployeeReport,
  getEmployeeReportById,
  getFormsBasedOnDeptIdAndRole,
  getSubmissionCount,
  getAnalytics,
} = require('../../controllers/hrm/employeeReportController');

const router = require('express').Router();

router.get('/all/:orgid', getAllEmployeeReports);

router.post('/create', createEmployeeReport);

router.get('/:id', getEmployeeReportById);

router.get('/departmentandrole/:deptId/:role', getFormsBasedOnDeptIdAndRole);

router.get('/submitCount/:orgid', getSubmissionCount);

router.post('/analytics/:orgid', getAnalytics);

module.exports = router;
