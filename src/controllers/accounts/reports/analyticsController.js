const mongoose = require('mongoose');

const Expense = require('../../../models/accounts/Expense');
// const EmployeeExpense = require('../../../models/accounts/EmployeeExpense');
const PCR = require('../../../models/accounts/PCR');
const Employee = require('../../../models/hrm/Employee');

const { asyncHandler } = require('../../../middleware/errorHandler');

const getAnalytics = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    startDate,
    endDate,
    project_orders,
    payment_mode,
    cost_center,
    employee_department,
    employee_groups,
    employee_teams,
  } = req.body;

  let start;
  if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  } else {
    const firstExpense = await Expense.findOne({ organization: orgid })
      .sort({ createdAt: 1 })
      .select('createdAt');
    start = new Date(firstExpense?.createdAt || new Date());
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(endDate || new Date());
  end.setHours(23, 59, 59, 999);

  let filteredEmployeeIds = [];
  if (
    employee_department?.length ||
    employee_groups?.length ||
    employee_teams?.length
  ) {
    const empFilter = { organization: orgid };

    if (employee_department?.length)
      empFilter.department = { $in: employee_department };

    if (employee_groups?.length) empFilter.group = { $in: employee_groups };

    if (employee_teams?.length) empFilter.team = { $in: employee_teams };

    filteredEmployeeIds =
      await Employee.find(empFilter).distinct('optionalUserId');
  }

  // --- Step 3: Build model filters
  const buildExpenseFilter = () => {
    const filter = { organization: new mongoose.Types.ObjectId(orgid) };
    if (payment_mode?.length) filter.paymentMode = { $in: payment_mode };
    if (cost_center?.length)
      filter.costCenter = {
        $in: cost_center.map((id) => new mongoose.Types.ObjectId(id)),
      };
    if (filteredEmployeeIds?.length)
      filter.agent = { $in: filteredEmployeeIds };
    filter.createdAt = { $gte: start, $lte: end };
    return filter;
  };

  const expenseFilter = buildExpenseFilter();
  const pcrFilter = buildExpenseFilter(); // PCR/OCR
  if (project_orders?.length)
    pcrFilter.projectOrder = {
      $in: project_orders.map((id) => new mongoose.Types.ObjectId(id)),
    };

  const aggregateMonthly = async (model) => {
    const data = await model.aggregate([
      {
        $match: model === PCR ? pcrFilter : expenseFilter,
      },
      {
        $addFields: {
          month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        },
      },
      { $group: { _id: '$month', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    return data.reduce((acc, { _id, count }) => ({ ...acc, [_id]: count }), {});
  };

  const expenseCounts = await aggregateMonthly(Expense);
  const pcrCounts = await aggregateMonthly(PCR);

  // --- Step 5: Build month labels
  const monthLabels = [];
  const current = new Date(start);
  while (current <= end) {
    monthLabels.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(
        2,
        '0'
      )}`
    );
    current.setMonth(current.getMonth() + 1);
  }

  // --- Step 6: Combine monthly data
  const monthlyData = monthLabels.map((month) => ({
    month,
    expenseCount: expenseCounts[month] || 0,
    pcrCount: pcrCounts[month] || 0,
  }));

  const summary = {
    totalExpense: Object.values(expenseCounts).reduce((a, b) => a + b, 0),
    totalPCR: Object.values(pcrCounts).reduce((a, b) => a + b, 0),
  };

  res.status(200).json({
    success: true,
    message: 'Analytics retrieved successfully',
    data: {
      monthlyData,
      summary,
    },
  });
});

module.exports = {
  getAnalytics,
};
