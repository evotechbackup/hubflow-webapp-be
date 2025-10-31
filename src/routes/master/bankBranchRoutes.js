const {
  getAllBankBranchMaster,
  getBankBranchMaster,
  createBankBranchMaster,
  updateBankBranchMaster,
  deleteBankBranchMaster,
} = require('../../controllers/master/bankBranchMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllBankBranchMaster);

router.get('/:id', getBankBranchMaster);

router.post('/create', createBankBranchMaster);

router.put('/update/:id', updateBankBranchMaster);

router.delete('/delete/:id', deleteBankBranchMaster);

module.exports = router;
