const {
  createPartialPaymentMade,
  createPaymentMade,
  updatePaymentMade,
  revisePaymentMade,
  getPaymentMadeByAgent,
  getAllPaymentMade,
  getPaymentMadeById,
  approvePaymentMadeStatus,
  rejectPaymentMade,
  updateApproval,
  invalidatePaymentMade,
  getFilteredPaymentMade,
  getFilteredPaymentMadeAgent,
  deletePaymentMade,
} = require('../../controllers/procurement/paymentMadeController');
const router = require('express').Router();

router.post('/partial', createPartialPaymentMade);

router.post('/:orderId', createPaymentMade);

router.put('/:id', updatePaymentMade);

router.put('/revised/:id', revisePaymentMade);

router.get('/agent/:agentid', getPaymentMadeByAgent);

router.get('/:orgid', getAllPaymentMade);

router.get('/paymentMadeById/:id', getPaymentMadeById);

router.put('/statusapprove/:id', approvePaymentMadeStatus);

router.put('/statusreject/:id', rejectPaymentMade);

router.put('/updateapproval/:id/:agent', updateApproval);

router.put('/invalidate/:id', invalidatePaymentMade);

router.get('/filter/:orgid', getFilteredPaymentMade);

router.get('/agent/filter/:agentid', getFilteredPaymentMadeAgent);

router.delete('/delete/:id', deletePaymentMade);

module.exports = router;
