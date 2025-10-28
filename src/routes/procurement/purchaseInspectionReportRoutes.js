const {
  getAllPurchaseInspectionReports,
  createPurchaseInspectionReport,
  getPurchaseInspectionReportById,
  submitPurchaseInspectionReport,
  getPurchaseInspectionReportSubmissions,
  getPurchaseInspectionReportSubmission,
} = require('../../controllers/procurement/purchaseInspectionReportController');
const router = require('express').Router();

router.get('/:orgid', getAllPurchaseInspectionReports);

router.post('/', createPurchaseInspectionReport);

router.get('/submissionById/:id', getPurchaseInspectionReportById);

router.post('/submit/:formId', submitPurchaseInspectionReport);

router.get(
  '/purchase-inspection/:reportId/submissions',
  getPurchaseInspectionReportSubmissions
);

router.get('/submission/:submissionId', getPurchaseInspectionReportSubmission);

module.exports = router;
