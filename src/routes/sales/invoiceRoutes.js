const {
  createInvoice,
  updateInvoice,
  revisedInvoice,
  getInvoices,
  getInvoicesForUser,
  getInvoiceById,
  approveInvoiceStatus,
  rejectInvoice,
  updateInvoiceApproval,
  getQuotationsByCustomerId,
  invalidateInvoice,
  getFilteredInvoices,
  getFilteredInvoicesByUser,
  getQRCodeForInvoice,
  checkInvoiceExistId,
  deleteInvoice,
} = require('../../controllers/sales/invoiceController');
const router = require('express').Router();

router.post('/', createInvoice);

router.put('/:invoiceId', updateInvoice);

router.put('/revised/:invoiceId', revisedInvoice);

router.get('/:orgid', getInvoices);

router.get('/agent/:agentid', getInvoicesForUser);

router.get('/invoicebyid/:id', getInvoiceById);

router.put('/statusapprove/:id/:agent', approveInvoiceStatus);

router.put('/statusreject/:id/:agent', rejectInvoice);

router.put('/updateapproval/:id/:agent', updateInvoiceApproval);

router.get('/quotation/:customerid', getQuotationsByCustomerId);

// router.get('/proposal/:customerid',

router.put('/invalidate/:id/:agent', invalidateInvoice);

//filter
router.get('/filter/:orgid', getFilteredInvoices);

router.get('/agent/filter/:agentid', getFilteredInvoicesByUser);

router.get('/getqrcodeforinvoice/:id', getQRCodeForInvoice);

router.get('/checkExistId/:orgid', checkInvoiceExistId);

router.delete('/delete/:id', deleteInvoice);

module.exports = router;
