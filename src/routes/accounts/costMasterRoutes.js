const {
  createCostMaster,
  getCostMasters,
  deleteCostMaster,
  updateCostMaster,
} = require('../../controllers/accounts/costMasterController');

const router = require('express').Router();

router.post('/create', createCostMaster);
router.get('/:orgid', getCostMasters);
router.delete('/:id', deleteCostMaster);
router.put('/:id', updateCostMaster);

module.exports = router;
