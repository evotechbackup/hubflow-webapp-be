const {
  createPCR,
  updatePCR,
  getPCRSlipById,
  getPCRs,
  approvePCR,
  rejectPCR,
  invalidatePCR,
  updateApproval,
  getPCRsByEmployeeId,
  getFulfilledPCRsByEmployeeId,
} = require('../../controllers/accounts/pcrController');

const router = require('express').Router();

router.post('/', createPCR);
router.put('/:id', updatePCR);
router.get('/getpcrslipbyid/:id', getPCRSlipById);
router.get('/getpcrs/:orgid', getPCRs);
router.put('/pcrapprove/:id', approvePCR);
router.put('/pcrreject/:id', rejectPCR);
router.put('/invalidate/:id', invalidatePCR);
router.put('/updateapproval/:id/:agentid', updateApproval);
router.get('/getpcrsbyemployeeid/:employeeid', getPCRsByEmployeeId);
router.get(
  '/getfulfilledpcrsbyemployeeid/:employeeid',
  getFulfilledPCRsByEmployeeId
);

module.exports = router;
