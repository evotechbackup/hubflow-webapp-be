const {
  getAllContainerInventoryMaster,
  getContainerInventoryMaster,
  createContainerInventoryMaster,
  updateContainerInventoryMaster,
  deleteContainerInventoryMaster,
} = require('../../controllers/master/containerInventoryMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllContainerInventoryMaster);

router.get('/:id', getContainerInventoryMaster);

router.post('/create', createContainerInventoryMaster);

router.put('/update/:id', updateContainerInventoryMaster);

router.delete('/delete/:id', deleteContainerInventoryMaster);

module.exports = router;
