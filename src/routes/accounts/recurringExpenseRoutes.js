const {
  getFilteredRecurringExpenses,
  getRecurringExpenseById,
} = require('../../controllers/accounts/recurringExpenseController');

const router = require('express').Router();

router.get('/:orgid', getFilteredRecurringExpenses);

router.get('/recurringexpensebyid/:id', getRecurringExpenseById);

module.exports = router;
