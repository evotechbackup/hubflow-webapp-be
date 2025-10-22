const {
  getAllCommodityMaster,
  getCommodityMaster,
  createCommodityMaster,
  updateCommodityMaster,
  deleteCommodityMaster,
} = require('../../controllers/master/commodityMasterController');

const router = require('express').Router();

router.get('/all/:orgid', getAllCommodityMaster);

router.get('/:id', getCommodityMaster);

router.post('/create', createCommodityMaster);

router.put('/update/:id', updateCommodityMaster);

router.delete('/delete/:id', deleteCommodityMaster);

module.exports = router;
