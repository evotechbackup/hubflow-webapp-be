const {
  getAllAreaMaster,
  getAreaMaster,
  createAreaMaster,
  updateAreaMaster,
  deleteAreaMaster,
} = require('../../controllers/master/areaMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllAreaMaster);

router.get('/:id', getAreaMaster);

router.post('/create', createAreaMaster);

router.put('/update/:id', updateAreaMaster);

router.delete('/delete/:id', deleteAreaMaster);

module.exports = router;
