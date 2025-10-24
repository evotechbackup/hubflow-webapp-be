const {
  createPCC,
  updatePCC,
  getPCCSlipById,
  getPCCs,
  pccApprove,
  pccReject,
  pccInvalidate,
  pccUpdateApproval,
  getPCCsByEmployeeId,
} = require('../../controllers/accounts/pccController');

const router = require('express').Router();

router.post('/', createPCC);
router.put('/:id', updatePCC);
router.get('/getpccslipbyid/:id', getPCCSlipById);
router.get('/getpccs/:orgid', getPCCs);
router.put('/pccapprove/:id', pccApprove);
router.put('/pccreject/:id', pccReject);
router.put('/invalidate/:id', pccInvalidate);
router.put('/updateapproval/:id/:agentid', pccUpdateApproval);
router.get('/getpccsbyemployeeid/:employeeid', getPCCsByEmployeeId);

module.exports = router;
