const {
  createOffer,
  getOffers,
  getOfferById,
  updateApproval,
} = require('../../controllers/recruit/recuitOfferController');

const router = require('express').Router();

router.get('/all/:orgid', getOffers);
router.get('/:id', getOfferById);
router.post('/create', createOffer);
router.put('/update/:id/:agent', updateApproval);


module.exports = router;
