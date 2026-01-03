const { asyncHandler } = require('../../middleware/errorHandler');
const mongoose = require('mongoose');
const Leads = require('../../models/crm/Leads');
const Employee = require('../../models/hrm/Employee');

const getCrmAnalytics = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const {
    startDate,
    endDate,
    accountType,
    industry,
    category_type,
    agent,
    employee_groups,
    employee_teams,
  } = req.body;

  // --- Step 1: Set date range
  let start;
  if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  } else {
    const firstLead = await Leads.findOne({ organization: orgId })
      .sort({ createdAt: 1 })
      .select('createdAt');
    start = new Date(firstLead?.createdAt || new Date());
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(endDate || new Date());
  end.setHours(23, 59, 59, 999);

  // --- Step 2: Filter employees if needed
  let filteredEmployeeIds = [];
  if (employee_groups?.length || employee_teams?.length) {
    const empFilter = { organization: orgId };

    if (employee_groups?.length) empFilter.group = { $in: employee_groups };

    if (employee_teams?.length) empFilter.team = { $in: employee_teams };

    filteredEmployeeIds = await Employee.find(empFilter).distinct('_id');
  }

  // --- Step 3: Build leads filter
  const buildLeadsFilter = () => {
    const filter = { organization: new mongoose.Types.ObjectId(orgId) };

    if (accountType) filter.customerType = accountType;

    if (industry) filter.industry = industry;

    if (category_type) filter.customerType = category_type;

    if (agent?.length) {
      filter.assignedTo = {
        $in: agent.map((id) => new mongoose.Types.ObjectId(id)),
      };
    } else if (filteredEmployeeIds?.length) {
      filter.assignedTo = { $in: filteredEmployeeIds };
    }

    filter.createdAt = { $gte: start, $lte: end };

    return filter;
  };

  const leadsFilter = buildLeadsFilter();

  const pipelineStatuses = [
    'new',
    'prospect',
    'proposal',
    'closed',
    'rejected',
    'noanswer',
    'callback',
    'pending',
    'junk',
  ];

  // --- Step 5: Aggregate pipeline data by month
  const pipelineData = await Leads.aggregate([
    { $match: leadsFilter },
    {
      $addFields: {
        month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      },
    },
    {
      $group: {
        _id: {
          month: '$month',
          status: '$pipelineStatus',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1, '_id.status': 1 } },
  ]);

  // --- Step 6: Build month labels
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

  // --- Step 7: Organize data by status and month
  const statusMonthMap = {};
  pipelineStatuses.forEach((status) => {
    statusMonthMap[status] = {};
  });

  pipelineData.forEach(({ _id, count }) => {
    const { month, status } = _id;
    if (statusMonthMap[status]) {
      statusMonthMap[status][month] = count;
    }
  });

  // --- Step 8: Build histogram data for each month
  const histogram = monthLabels.map((month) => {
    const monthData = { month };

    pipelineStatuses.forEach((status) => {
      monthData[status] = statusMonthMap[status][month] || 0;
    });

    return monthData;
  });

  // --- Step 9: Calculate summary totals for each status
  const summary = {};
  pipelineStatuses.forEach((status) => {
    summary[`total_${status}`] = Object.values(statusMonthMap[status]).reduce(
      (a, b) => a + b,
      0
    );
  });

  // Total leads count
  summary.totalLeads = Object.values(summary).reduce((a, b) => a + b, 0);

  // --- Step 10: Get current status counts (for current state snapshot)
  const currentStatusCounts = await Leads.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgId),
        ...(accountType && { customerType: accountType }),
        ...(industry && { industry: { $in: industry } }),
        ...(agent?.length && {
          assignedTo: {
            $in: agent.map((id) => new mongoose.Types.ObjectId(id)),
          },
        }),
        ...(filteredEmployeeIds?.length &&
          !agent?.length && {
            assignedTo: { $in: filteredEmployeeIds },
          }),
      },
    },
    {
      $group: {
        _id: '$pipelineStatus',
        count: { $sum: 1 },
      },
    },
  ]);

  const currentSnapshot = {};
  pipelineStatuses.forEach((status) => {
    currentSnapshot[status] = 0;
  });

  currentStatusCounts.forEach(({ _id, count }) => {
    if (Object.hasOwn(currentSnapshot, _id)) {
      currentSnapshot[_id] = count;
    }
  });

  res.status(200).json({
    success: true,
    message: 'Contact created successfully',
    data: {
      histogram,
      summary,
      currentSnapshot,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    },
  });
});
module.exports = {
  getCrmAnalytics,
};
