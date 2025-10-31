const {
  getAllDistrictMaster,
  getDistrictMaster,
  createDistrictMaster,
  updateDistrictMaster,
  deleteDistrictMaster,
} = require('../../controllers/master/districtMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllDistrictMaster);

router.get('/:id', getDistrictMaster);

router.post('/create', createDistrictMaster);

router.put('/update/:id', updateDistrictMaster);

router.delete('/delete/:id', deleteDistrictMaster);

module.exports = router;
