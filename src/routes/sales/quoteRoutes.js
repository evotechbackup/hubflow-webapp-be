const router = require('express').Router();

const {
  postQuotes,
  getQuotes,
  getQuotesById,
  getQuotesDetailsById,
  updateQuote,
  rejectQuote,
  updateQuoteApproval,
  changeValidation,
  deleteQuote,
} = require('../../controllers/sales/quotesController');

router.post('/:orderId?', postQuotes);

router.get('/quotebyid/:id', getQuotesById);

router.get('/quotebyquoteid/:id', getQuotesDetailsById);

router.put('/statusreject/:id', rejectQuote);

router.put('/updateapproval/:id', updateQuoteApproval);

router.put('/changevalidation/:id', changeValidation);

router.put('/:id', updateQuote);

router.get('/filter/:orgid', getQuotes);

router.delete('/delete/:id', deleteQuote);

module.exports = router;
