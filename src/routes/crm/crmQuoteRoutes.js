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

router.get('/filter/:orgid', getFilterQuotes);
router.get('/agent-filter/:agentid', getAgentFilterQuotes);
router.get('/quotebyid/:id', getQuoteById);
router.get('/quotebyquoteid/:id', getQuoteByQuoteId);

router.post('/:dealId', createQuote);

router.put('/:id', updateQuote);
router.put('/changevalidation/:id', changeValidation);
router.put('/edit-status/:id', updateQuoteStatus);

module.exports = router;
