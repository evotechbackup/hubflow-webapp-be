const {
  createPurchaseOrder,
  updatePurchaseOrder,
  revisedPurchaseOrder,
  getPurchaseOrdersByAgent,
  getPurchaseOrdersByOrganization,
  getPurchaseOrdersLength,
  getPurchaseOrdersById,
  getPurchaseOrderDetailsByOrganization,
  purchaseOrderApprove,
  purchaseOrderReject,
  purchaseOrderUpdateApproval,
  purchaseOrderInvalidate,
  getFilteredPurchaseOrders,
  getFilteredPurchaseOrdersWithoutPagination,
  getFilteredPurchaseOrdersByUser,
  getDashboardData,
  getPendingPayment,
  getInspectionRequired,
  deletePurchaseOrder,
  getPurchaseQuotations,
  getPurchaseOrdersPayment,
  checkExistId,
} = require('../../controllers/procurement/purchaseOrderController');
const router = require('express').Router();

router.post('/:orderId', createPurchaseOrder);

router.put('/:poId', updatePurchaseOrder);

router.put('/revised/:poId', revisedPurchaseOrder);

router.get('/agent/:agentid', getPurchaseOrdersByAgent);

router.get('/:orgid', getPurchaseOrdersByOrganization);

router.get('/quotationlength', getPurchaseOrdersLength);

router.get('/quotationbyid/:id', getPurchaseOrdersById);

router.get('/purchasedetails/:orgid', getPurchaseOrderDetailsByOrganization);

router.put('/statusapprove/:id/:agent', purchaseOrderApprove);

router.put('/statusreject/:id/:agent', purchaseOrderReject);

router.put('/updateapproval/:id/:agent', purchaseOrderUpdateApproval);

router.put('/invalidate/:id/:agent', purchaseOrderInvalidate);

router.get('/filter/:orgid', getFilteredPurchaseOrders);

router.get(
  '/filterwithoutPagination/:orgid',
  getFilteredPurchaseOrdersWithoutPagination
);

router.get('/agent/filter/:agentid', getFilteredPurchaseOrdersByUser);

router.get('/get-dashboard-data/:orgid', getDashboardData);

router.get('/get-pending-payment/:orgid', getPendingPayment);

router.get('/get-inspection-required/:orgid', getInspectionRequired);

router.delete('/delete/:id', deletePurchaseOrder);

router.get('/purchaseQuotations/:vendorId', getPurchaseQuotations);

router.get('/purchaseorders/payment/:vendorId', getPurchaseOrdersPayment);

router.get('/checkExistId/:orgid', checkExistId);

module.exports = router;
