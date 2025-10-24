const RecurringExpense = require('../../models/accounts/RecurringExpense');
const { asyncHandler } = require('../../middleware/errorHandler');

const getFilteredRecurringExpenses = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate, search_query } = req.query;

  const dateFilter = {};
  if (startDate && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    organization: orgid,
  };

  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }

  if ((startDate && startDate !== 'null') || (endDate && endDate !== 'null')) {
    query.date = dateFilter;
  }

  const recurringExpenses = await RecurringExpense.find(query)
    .select('amount vendor customer notes date reference id')
    .sort({ date: -1 });

  res.json({
    success: true,
    message: 'Recurring expenses fetched successfully',
    data: recurringExpenses,
  });
});

const getRecurringExpenseById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const recurringExpense = await RecurringExpense.findById(id)
    .populate('customer', ['displayName'])
    .populate('vendor', ['displayName']);
  res.json({
    success: true,
    message: 'Recurring expense fetched successfully',
    data: recurringExpense,
  });
});

module.exports = {
  getFilteredRecurringExpenses,
  getRecurringExpenseById,
};
