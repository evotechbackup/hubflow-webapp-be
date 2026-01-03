const {
  createQuote,
  getFilterQuotes,
  getAgentFilterQuotes,
  getQuoteById,
  getQuoteByQuoteId,
  updateQuote,
  changeValidation,
  updateQuoteStatus,
} = require('../../controllers/crm/crmQuotesController');

const router = require('express').Router();

router.post('/:dealId', createQuote);

router.get('/filter/:orgid', getFilterQuotes);

router.get('/agent-filter/:agentid', getAgentFilterQuotes);

router.get('/quotebyid/:id', getQuoteById);

router.get('/quotebyfortem/:id', getQuoteById);

router.get('/quotebyquoteid/:id', getQuoteByQuoteId);

router.put('/update/:id', updateQuote);
router.put('/changevalidation/:id', changeValidation);
router.put('/edit-status/:id', updateQuoteStatus);

module.exports = router;
