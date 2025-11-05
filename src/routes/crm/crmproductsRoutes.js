const {
   createCRMProduct,
  getAllCRMProducts,
  addProductToCRMProducts,
} = require('../../controllers/crm/crmProductController');

const router = require('express').Router();

router.get('/:orgid', getAllCRMProducts);

router.post('/create', createCRMProduct);

router.put('/add-product/:orgid', addProductToCRMProducts);

module.exports = router;
