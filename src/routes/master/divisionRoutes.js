const {
  getAllDivisionMaster,
  getDivisionMaster,
  createDivisionMaster,
  updateDivisionMaster,
  deleteDivisionMaster,
} = require('../../controllers/master/divisionMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllDivisionMaster);

router.get('/:id', getDivisionMaster);

router.post('/create', createDivisionMaster);

router.put('/update/:id', updateDivisionMaster);

router.delete('/delete/:id', deleteDivisionMaster);

module.exports = router;
