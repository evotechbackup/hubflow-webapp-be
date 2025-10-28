const {
  createPCCVoucher,
  updatePCCVoucher,
  updatePCCVoucherRevised,
  getPCCVoucherById,
  getPCCVouchers,
  approvePCCVoucherStatus,
  rejectPCCVoucherStatus,
  invalidatePCCVoucher,
  updatePCCVoucherApproval,
} = require('../../../controllers/accounts/vouchers/pccVoucherController');

const router = require('express').Router();

router.post('/', createPCCVoucher);

router.put('/:id', updatePCCVoucher);

router.put('/revised/:id', updatePCCVoucherRevised);

router.get('/getpccvoucherbyid/:id', getPCCVoucherById);

router.get('/getpccvouchers/:orgid', getPCCVouchers);

router.put('/pccvoucherapprove/:id', approvePCCVoucherStatus);

router.put('/pccvoucherreject/:id', rejectPCCVoucherStatus);

router.put('/invalidate/:id', invalidatePCCVoucher);

router.put('/updateapproval/:id/:agentid', updatePCCVoucherApproval);

module.exports = router;
