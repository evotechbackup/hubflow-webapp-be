const {
  getAllPackMaster,
  getPackMaster,
  createPackMaster,
  updatePackMaster,
  deletePackMaster,
} = require('../../controllers/master/packMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllPackMaster);

router.get('/:id', getPackMaster);

router.post('/create', createPackMaster);

router.put('/update/:id', updatePackMaster);

router.delete('/delete/:id', deletePackMaster);

module.exports = router;
