const {
  getAllCountryMaster,
  getCountryMaster,
  createCountryMaster,
  updateCountryMaster,
  deleteCountryMaster,
} = require('../../controllers/master/countryMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllCountryMaster);

router.get('/:id', getCountryMaster);

router.post('/create', createCountryMaster);

router.put('/update/:id', updateCountryMaster);

router.delete('/delete/:id', deleteCountryMaster);

module.exports = router;
