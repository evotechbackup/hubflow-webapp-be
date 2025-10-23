const {
  getAllAirPortMaster,
  getAirPortMaster,
  createAirPortMaster,
  updateAirPortMaster,
  deleteAirPortMaster,
} = require('../../controllers/master/airPortMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllAirPortMaster);

router.get('/:id', getAirPortMaster);

router.post('/create', createAirPortMaster);

router.put('/update/:id', updateAirPortMaster);

router.delete('/delete/:id', deleteAirPortMaster);

module.exports = router;
