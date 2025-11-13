const {
  createPartialBill,
  createBill,
  updateBill,
  revisedBill,
  getBillsByAgent,
  getBillsByOrganization,
  getBillById,
  getBillOfVendor,
  markAsPaid,
  approveBillUpdate,
  rejectBill,
  updateApproval,
  invalidateBill,
  getBillTreeView,
  getFilteredBills,
  getFilteredBillsWithoutPagination,
  getFilteredBillsByAgent,
  deleteBill,
  checkExistId,
  getJobsByVendorId,
} = require('../../controllers/procurement/billsController');
const router = require('express').Router();

router.post('/partial', createPartialBill);

router.post('/', createBill);

router.put('/:billId', updateBill);

router.put('/revised/:billId', revisedBill);

router.get('/agent/:agentid', getBillsByAgent);

router.get('/:orgid', getBillsByOrganization);

router.get('/billsById/:id', getBillById);

router.get('/billOfVendor/:vendorId', getBillOfVendor);

router.put('/markAsPaid/:id', markAsPaid);

router.put('/statusapprove/:id', approveBillUpdate);

router.put('/statusreject/:id', rejectBill);

router.put('/updateapproval/:id/:agent', updateApproval);

router.put('/invalidate/:id', invalidateBill);

router.get('/tree-view/:id', getBillTreeView);

router.get('/filter/:orgid', getFilteredBills);

router.get(
  '/filterWithoutPagination/:orgid',
  getFilteredBillsWithoutPagination
);

router.get('/agent/filter/:agentid', getFilteredBillsByAgent);

router.delete('/delete/:id', deleteBill);

router.get('/checkExistId/:orgid', checkExistId);

router.get('/jobs/:vendorId', getJobsByVendorId);

module.exports = router;
