const {
  getAllPurchaseInspectionForms,
  getAllPurchaseInspectionFormIds,
  createPurchaseInspectionForm,
  getPurchaseInspectionFormById,
  getSubmissionCount,
} = require('../../controllers/procurement/purchaseInspectionFormController');
const router = require('express').Router();

router.get('/allPurchaseInspectionForm/:orgid', getAllPurchaseInspectionForms);

router.get('/allFormIds/:orgid', getAllPurchaseInspectionFormIds);

router.post('/', createPurchaseInspectionForm);

router.get('/purchaseInspectionFormById/:id', getPurchaseInspectionFormById);

router.get('/submission-count/:orgid', getSubmissionCount);

module.exports = router;
