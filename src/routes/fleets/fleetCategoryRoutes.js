const {
  createCategory,
  updateCategory,
  deleteCategory,
  getFleetCategoryById,
  getFleetCategoriesByOrgId,
  getFleetCategoriesFilterByOrgId,
  getFleetCategoriesForSelect,
  getFleetCategoriesSelect,
} = require('../../controllers/fleets/fleetsCategoryController');
const { authenticate } = require('../../middleware');

const router = require('express').Router();
const multer = require('multer');

const storage = multer.memoryStorage();

const upload = multer({ storage });

router.get('/:orgid', authenticate, getFleetCategoriesByOrgId);
router.get('/:id', authenticate, getFleetCategoryById);
router.get('/filter/:orgid', authenticate, getFleetCategoriesFilterByOrgId);
router.get(
  '/categories-for-select/:orgid/:type',
  authenticate,
  getFleetCategoriesForSelect
);
router.get('/categories/:orgid/:type', authenticate, getFleetCategoriesSelect);

router.post('/add', authenticate, createCategory);
router.post('/uploadfleetdocs/', upload.single('file'), createCategory);

router.put('/edit/:id', authenticate, updateCategory);

router.delete('/:id', authenticate, deleteCategory);

module.exports = router;
