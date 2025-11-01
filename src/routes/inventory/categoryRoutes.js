const {
  createCategory,
  getAllCategories,
  getcategorybyid,
  updateCategory,
  deleteCategory,
  productscategory,
  filterCategory,
  getproductsByType,
  getAllProducts,
  filterCategories,
  categoryById,
} = require('../../controllers/inventory/categoryController');

const router = require('express').Router();

router.get('/:orgid', getAllCategories);
router.get('/getcategorybyid/:id', getcategorybyid);
router.get('/products/:orgId/:type', getproductsByType);
router.get('/all-products-catrgory/:orgId', getAllProducts);
router.get('/filter/:orgid', filterCategories);
router.get('/:id', categoryById);
router.get('/productscategory/:categoryId', productscategory);
router.get('/filter/:orgid', filterCategory);

router.post('/', createCategory);

router.put('/:id', updateCategory);

router.delete('/:id', deleteCategory);

module.exports = router;
