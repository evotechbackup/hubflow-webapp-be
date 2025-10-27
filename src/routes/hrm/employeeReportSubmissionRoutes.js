const {
  createEmployeeReportSubmission,
  getEmployeeReportSubmissions,
  getEmployeeReportSubmissionById,
  submitEmployeeReport,
  getEmployeeReportSubmissionsByReportId,
  getEmployeeReportSubmissionByReportId,
} = require('../../controllers/hrm/employeeReportSubmissionController');

const router = require('express').Router();

router.get('/all/:orgid', getEmployeeReportSubmissions);

router.post('/create', createEmployeeReportSubmission);

router.get('/:id', getEmployeeReportSubmissionById);

router.get('/report/:reportId', getEmployeeReportSubmissionsByReportId);

router.get('/emplreport/:submissionId', getEmployeeReportSubmissionByReportId);

router.post('/submit/:formId', submitEmployeeReport);

module.exports = router;
