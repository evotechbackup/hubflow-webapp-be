const {
  getAllNationalityMaster,
  getNationalityMaster,
  createNationalityMaster,
  updateNationalityMaster,
  deleteNationalityMaster,
} = require('../../controllers/master/nationalityMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllNationalityMaster);

router.get('/:id', getNationalityMaster);

router.post('/create', createNationalityMaster);

router.put('/update/:id', updateNationalityMaster);

router.delete('/delete/:id', deleteNationalityMaster);

module.exports = router;
