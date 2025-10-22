const {
  createServiceCategory,
  getServiceCategories,
  updateServiceCategory,
  deleteServiceCategory,
} = require('../../controllers/operations/serviceCategoryController');

const express = require('express');
const router = express.Router();

router.post('/', createServiceCategory);

router.get('/:orgId', getServiceCategories);

router.put('/:id', updateServiceCategory);

router.delete('/:id', deleteServiceCategory);

module.exports = router;
