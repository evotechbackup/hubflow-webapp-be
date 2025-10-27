const {
  createPartialPurchaseReceive,
  createPurchaseReceive,
  updatePurchaseReceive,
  revisedPurchaseReceived,
  getPurchaseReceivedByAgent,
  getPurchaseReceivesByOrganization,
  getPurchaseReceiveLength,
  getPurchaseReceiveById,
  getPurchaseReceiveByPurchaseOrder,
  getPurchaseReceiveByVendorId,
  approvePurchaseReceive,
  rejectPurchaseReceive,
  updatePurchaseReceiveApproval,
  invalidatePurchaseReceive,
  getFilteredPurchaseReceives,
  getFilteredPurchaseReceivesWithoutPagination,
  getFilteredPurchaseReceivesByAgent,
  deletePurchaseReceived,
  getPurchaseReceivedById,
} = require('../../controllers/procurement/purchaseReceiveController');
const router = require('express').Router();

router.post('/partial', createPartialPurchaseReceive);

router.post('/:orderId', createPurchaseReceive);

router.put('/:ids', updatePurchaseReceive);

router.put('/revised/:id', revisedPurchaseReceived);

router.get('/agent/:agentid', getPurchaseReceivedByAgent);

router.get('/:orgid', getPurchaseReceivesByOrganization);

router.get('/purchaseReceiveLength', getPurchaseReceiveLength);

router.get('/getpurchasereceivebyid/:id', getPurchaseReceiveById);

router.get(
  '/getpurchasereceivebypurchaseid/:id',
  getPurchaseReceiveByPurchaseOrder
);

router.get('/vendorId/:vendorId', getPurchaseReceiveByVendorId);

router.put('/statusapprove/:id', approvePurchaseReceive);

router.put('/statusreject/:id', rejectPurchaseReceive);

router.put('/updateapproval/:id/:agent', updatePurchaseReceiveApproval);

router.put('/invalidate/:id', invalidatePurchaseReceive);
router.get('/filter/:orgid', getFilteredPurchaseReceives);

router.get(
  '/filterWithoutPagination/:orgid',
  getFilteredPurchaseReceivesWithoutPagination
);

router.get('/agent/filter/:agentid', getFilteredPurchaseReceivesByAgent);

router.delete('/delete/:id', deletePurchaseReceived);

router.get('/checkExistId/:orgid', getPurchaseReceivedById);

module.exports = router;
