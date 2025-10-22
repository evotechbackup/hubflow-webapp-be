const {
  getAllRegionMaster,
  getRegionMaster,
  createRegionMaster,
  updateRegionMaster,
  deleteRegionMaster,
} = require('../../controllers/master/regionMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllRegionMaster);

router.get('/:id', getRegionMaster);

router.post('/create', createRegionMaster);

router.put('/update/:id', updateRegionMaster);

router.delete('/delete/:id', deleteRegionMaster);

module.exports = router;
