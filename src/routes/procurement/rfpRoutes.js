const {
  createRFP,
  getRFPById,
  approveRFP,
  rejectRFP,
  updateRFPApproval,
  changeValidation,
  updateRFP,
  reviseRFP,
  filterRFPs,
  filterRFPsWithoutPagination,
  filterRFPsByAgent,
  getRFPListForRFQ,
  deleteRFP,
  checkExistId,
} = require('../../controllers/procurement/rfpController');
const router = require('express').Router();

router.post('/:orderId?', createRFP);

// Get routes
router.get('/getrfpbyid/:id', getRFPById);
router.get('/filter/:orgid', filterRFPs);
router.get('/filterWithoutPagination/:orgid', filterRFPsWithoutPagination);
router.get('/agent/filter/:agentid', filterRFPsByAgent);
router.get('/rfp-list-for-rfq/:orgid', getRFPListForRFQ);
router.get('/checkExistId/:orgid', checkExistId);

// Update routes
router.put('/statusapprove/:id', approveRFP);
router.put('/statusreject/:id', rejectRFP);
router.put('/updateapproval/:id/:agent', updateRFPApproval);
router.put('/changevalidation/:id', changeValidation);
router.put('/revised/:id', reviseRFP);
router.put('/:id', updateRFP);

// Delete routes
router.delete('/delete/:id', deleteRFP);

module.exports = router;
