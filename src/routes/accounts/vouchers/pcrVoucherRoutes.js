const {
  createPCRVoucher,
  updatePCRVoucher,
  updatePCRVoucherRevised,
  getPCRVoucherById,
  getPCRVouchers,
  approvePCRVoucherStatus,
  rejectPCRVoucher,
  invalidatePCRVoucher,
  updateApproval,
} = require('../../../controllers/accounts/vouchers/pcrVoucherController');

const router = require('express').Router();

router.post('/', createPCRVoucher);

router.put('/:id', updatePCRVoucher);

router.put('/revised/:id', updatePCRVoucherRevised);

router.get('/getpcrvoucherbyid/:id', getPCRVoucherById);

router.get('/getpcrvouchers/:orgid', getPCRVouchers);

router.put('/pcrvoucherapprove/:id', approvePCRVoucherStatus);

router.put('/pcrvoucherreject/:id', rejectPCRVoucher);

router.put('/invalidate/:id', invalidatePCRVoucher);

router.put('/updateapproval/:id/:agentid', updateApproval);

module.exports = router;
