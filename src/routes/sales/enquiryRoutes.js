const router = require('express').Router();

const {
  postEnquiry,
  getEnquiry,
  getEnquiryById,
  getEnquiryDetailsById,
  updateEnquiry,
  updateEnquiryStatus,
  updateEnquiryApproval,
  changeValidation,
  deleteEnquiry,
} = require('../../controllers/sales/enquiryController');

router.post('/', postEnquiry);
router.get('/enquirybyid/:id', getEnquiryById);
router.get('/enquirydetailsbyid/:id', getEnquiryDetailsById);
router.put('/statusreject/:id', updateEnquiryStatus);
router.put('/updateapproval/:id', updateEnquiryApproval);
router.put('/changevalidation/:id', changeValidation);
router.put('/:id', updateEnquiry);
router.get('/filter/:orgid', getEnquiry);
router.delete('/:id', deleteEnquiry);

module.exports = router;
