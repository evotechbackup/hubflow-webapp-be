const {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
} = require('../../controllers/crm/itemsController');

const router = require('express').Router();

router.get('/:orgid', getAllItems);
router.get('/getitembyid/:id', getItemById);

router.post('/create', createItem);

router.put('/:id', updateItem);

module.exports = router;
