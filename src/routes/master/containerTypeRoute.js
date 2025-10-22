const {
  getAllContainerTypeMaster,
  getContainerTypeMaster,
  createContainerTypeMaster,
  updateContainerTypeMaster,
  deleteContainerTypeMaster,
} = require('../../controllers/master/containerTypeController');

const router = require('express').Router();

router.get('/all/:orgid', getAllContainerTypeMaster);

router.get('/:id', getContainerTypeMaster);

router.post('/create', createContainerTypeMaster);

router.put('/update/:id', updateContainerTypeMaster);

router.delete('/delete/:id', deleteContainerTypeMaster);

module.exports = router;
