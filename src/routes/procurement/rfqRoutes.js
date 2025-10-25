const {
  getRFQs,
  getRFQLength,
  getRFQById,
  createRFQ,
  getRFQsByAgent,
  approveRFQ,
  updateRFQApproval,
  rejectRFQ,
  changeValidation,
  updateRFQ,
  reviseRFQ,
  filterRFQs,
  filterRFQsWithoutPagination,
  filterRFQsByAgent,
  deleteRFQ,
  checkExistId,
} = require('../../controllers/procurement/rfqController');
const router = require('express').Router();

router.post('/:orderId?', createRFQ);

// Get routes
router.get('/rfqlength', getRFQLength);
router.get('/getrfqbyid/:id', getRFQById);
router.get('/agent/:agentid', getRFQsByAgent);
router.get('/filter/:orgid', filterRFQs);
router.get('/filterWithoutPagination/:orgid', filterRFQsWithoutPagination);
router.get('/agent/filter/:agentid', filterRFQsByAgent);
router.get('/checkExistId/:orgid', checkExistId);
router.get('/:orgid', getRFQs);

// Update routes
router.put('/statusapprove/:id', approveRFQ);
router.put('/updateapproval/:id/:agent', updateRFQApproval);
router.put('/statusreject/:id', rejectRFQ);
router.put('/changevalidation/:id', changeValidation);
router.put('/revised/:id', reviseRFQ);
router.put('/:id', updateRFQ);

// Delete routes
router.delete('/delete/:id', deleteRFQ);

module.exports = router;
