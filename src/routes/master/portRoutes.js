const {
  getAllPortMaster,
  getPortMaster,
  createPortMaster,
  updatePortMaster,
  deletePortMaster,
} = require('../../controllers/master/portMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllPortMaster);

router.get('/:id', getPortMaster);

router.post('/create', createPortMaster);

router.put('/update/:id', updatePortMaster);

router.delete('/delete/:id', deletePortMaster);

module.exports = router;
