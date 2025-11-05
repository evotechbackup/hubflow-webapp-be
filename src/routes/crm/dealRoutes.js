const {
  createDeal,
  changeOrderStatus,
  updateDeal,
  getDeals,
  getDealById,
  getDealHistoryById,
} = require('../../controllers/crm/dealController');

const router = require('express').Router();

router.get('/:orgid', getDeals);

router.get('/getdealbyid/:id', getDealById);

router.post('/create', createDeal);

router.put('/:id', updateDeal);

router.put('/changeorderstatus', changeOrderStatus);

router.get('/getdealhistorybyid/:dealId', getDealHistoryById);

module.exports = router;
