const {
  getAllVesselMaster,
  getVesselMaster,
  createVesselMaster,
  updateVesselMaster,
  deleteVesselMaster,
} = require('../../controllers/master/vesselMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllVesselMaster);

router.get('/:id', getVesselMaster);

router.post('/create', createVesselMaster);

router.put('/update/:id', updateVesselMaster);

router.delete('/delete/:id', deleteVesselMaster);

module.exports = router;
