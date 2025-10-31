const {
  getAllAddressMaster,
  getAddressMaster,
  createAddressMaster,
  updateAddressMaster,
  deleteAddressMaster,
} = require('../../controllers/master/addressMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllAddressMaster);

router.get('/:id', getAddressMaster);

router.post('/create', createAddressMaster);

router.put('/update/:id', updateAddressMaster);

router.delete('/delete/:id', deleteAddressMaster);

module.exports = router;
