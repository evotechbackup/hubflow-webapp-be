const {
  getAllCurrencyMaster,
  getCurrencyMaster,
  createCurrencyMaster,
  updateCurrencyMaster,
  deleteCurrencyMaster,
} = require('../../controllers/master/currencyController');

const router = require('express').Router();

router.get('/all/:orgid', getAllCurrencyMaster);

router.get('/:id', getCurrencyMaster);

router.post('/create', createCurrencyMaster);

router.put('/update/:id', updateCurrencyMaster);

router.delete('/delete/:id', deleteCurrencyMaster);

module.exports = router;
