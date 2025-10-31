const {
  getAllCityMaster,
  getCityMaster,
  createCityMaster,
  updateCityMaster,
  deleteCityMaster,
} = require('../../controllers/master/cityMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllCityMaster);

router.get('/:id', getCityMaster);

router.post('/create', createCityMaster);

router.put('/update/:id', updateCityMaster);

router.delete('/delete/:id', deleteCityMaster);

module.exports = router;
