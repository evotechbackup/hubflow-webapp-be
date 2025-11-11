const {
  createAdjustment,
  createDraft,
  approveAdjustment,
  getInventoryAdjustments,
  getInventoryAdjustment,
  addReason,
  getReasons,
} = require('../../controllers/inventory/inventoryAdjustmentController');

const router = require('express').Router();

router.get('/:orgid', getInventoryAdjustments);
router.get('/get-adjustment/:id', getInventoryAdjustment);
router.get('/get-reasons/:id', getReasons);

router.post('/adjusted', createAdjustment);
router.post('/draft', createDraft);
router.post('/approve', approveAdjustment);

router.put('/approve/:id', approveAdjustment);
router.put('/add-reason/:orgid', addReason);

module.exports = router;
