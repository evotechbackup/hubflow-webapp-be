const {
  getAllZoneMaster,
  getZoneMaster,
  createZoneMaster,
  updateZoneMaster,
  deleteZoneMaster,
} = require('../../controllers/master/zoneMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllZoneMaster);

router.get('/:id', getZoneMaster);

router.post('/create', createZoneMaster);

router.put('/update/:id', updateZoneMaster);

router.delete('/delete/:id', deleteZoneMaster);

module.exports = router;
