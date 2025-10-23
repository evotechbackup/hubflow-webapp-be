const {
  getAllLandPortMaster,
  getLandPortMaster,
  createLandPortMaster,
  updateLandPortMaster,
  deleteLandPortMaster,
} = require('../../controllers/master/LandPortMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllLandPortMaster);

router.get('/:id', getLandPortMaster);

router.post('/create', createLandPortMaster);

router.put('/update/:id', updateLandPortMaster);

router.delete('/delete/:id', deleteLandPortMaster);

module.exports = router;
