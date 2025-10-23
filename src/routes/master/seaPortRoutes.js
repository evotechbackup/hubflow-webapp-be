const {
  getAllSeaPortMaster,
  getSeaPortMaster,
  createSeaPortMaster,
  updateSeaPortMaster,
  deleteSeaPortMaster,
} = require('../../controllers/master/seaPortMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllSeaPortMaster);

router.get('/:id', getSeaPortMaster);

router.post('/create', createSeaPortMaster);

router.put('/update/:id', updateSeaPortMaster);

router.delete('/delete/:id', deleteSeaPortMaster);

module.exports = router;
