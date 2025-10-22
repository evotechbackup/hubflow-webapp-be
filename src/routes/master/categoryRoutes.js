const {
  getAllCategoryMaster,
  getCategoryMaster,
  createCategoryMaster,
  updateCategoryMaster,
  deleteCategoryMaster,
} = require('../../controllers/master/categoryMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllCategoryMaster);

router.get('/:id', getCategoryMaster);

router.post('/create', createCategoryMaster);

router.put('/update/:id', updateCategoryMaster);

router.delete('/delete/:id', deleteCategoryMaster);

module.exports = router;
