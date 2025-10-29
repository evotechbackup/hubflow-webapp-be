const {
  getAllEmployeeReports,
  createEmployeeReport,
  getEmployeeReportById,
  getFormsBasedOnDeptIdAndRole,
  getSubmissionCount,
  getAnalytics,
  updateEmployeeReport,
  deleteEmployeeReport,
} = require('../../controllers/hrm/employeeReportController');

const router = require('express').Router();

router.get('/all/:orgid', getAllEmployeeReports);

router.post('/create', createEmployeeReport);

router.put('/update/:id', updateEmployeeReport);

router.get('/:id', getEmployeeReportById);

router.get('/departmentandrole/:deptId/:role', getFormsBasedOnDeptIdAndRole);

router.get('/submitCount/:orgid', getSubmissionCount);

router.post('/analytics/:orgid', getAnalytics);

router.delete('/delete/:id', deleteEmployeeReport);

module.exports = router;
