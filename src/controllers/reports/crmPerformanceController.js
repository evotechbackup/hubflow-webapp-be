const { asyncHandler } = require('../../middleware/errorHandler');
const mongoose = require('mongoose');

const CRMInterests = require('../../models/crm/CRMInterests');
const CRMQuote = require('../../models/crm/CRMQuote');
const CRMTasks = require('../../models/crm/CRMTasks');
const Employee = require('../../models/hrm/Employee');
const Agent = require('../../models/auth/User');

const getPerformance = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const { startDate, endDate, employee_department } = req.query;

  // Build date filter only if dates are provided
  let dateFilter = {};
  if (startDate && endDate) {
    const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    const end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    dateFilter = { start, end };
  }

  // Build employee match filter
  const employeeMatchFilter = {
    organization: new mongoose.Types.ObjectId(orgId),
    isActivated: true,
  };

  // // Add department filter if provided
  // if (employee_department) {
  //   const departmentIds = employee_department
  //     .split(",")
  //     .map((id) => new mongoose.Types.ObjectId(id.trim()));
  //   employeeMatchFilter.department = { $in: departmentIds };
  // }

  // Get all employees matching the filter
  const employees = await Employee.find(employeeMatchFilter)
    .select(
      '_id firstName lastName email department designation optionalUserId'
    )
    .lean();

  // Get agents linked to these employees
  const employeeIds = employees.map((emp) => emp._id);
  const optionalUserIds = employees
    .map((emp) => emp.optionalUserId)
    .filter((id) => id);

  // console.log("employeeIds", employeeIds, employees);

  const agents = await Agent.find({
    $or: [
      { employee: { $in: employeeIds } },
      { userid: { $in: optionalUserIds } },
    ],
    organization: new mongoose.Types.ObjectId(orgId),
  })
    .select('_id employee userid')
    .lean();
  console.log('agents', agents);

  // Create mapping of employee to agent
  const employeeToAgent = new Map();
  const agentToEmployee = new Map();

  agents.forEach((agent) => {
    if (agent.employee) {
      employeeToAgent.set(agent.employee.toString(), agent._id);
      agentToEmployee.set(agent._id.toString(), agent.employee);
    }
  });

  // Also map by userid/optionalUserId
  employees.forEach((emp) => {
    if (emp.optionalUserId) {
      const matchingAgent = agents.find((a) => a.userid === emp.optionalUserId);
      if (matchingAgent) {
        employeeToAgent.set(emp._id.toString(), matchingAgent._id);
        agentToEmployee.set(matchingAgent._id.toString(), emp._id);
      }
    }
  });

  const agentIds = agents.map((agent) => agent._id);

  // Build CRM data filters
  const crmDateFilter = dateFilter.start
    ? { createdAt: { $gte: dateFilter.start, $lte: dateFilter.end } }
    : {};

  const taskDateFilter = dateFilter.start
    ? { start: { $gte: dateFilter.start, $lte: dateFilter.end } }
    : {};

  // Fetch CRM data for all agents
  const [tasks, meetings, quotes, interests] = await Promise.all([
    // Tasks (type: "task")
    CRMTasks.find({
      organization: new mongoose.Types.ObjectId(orgId),
      createdBy: { $in: agentIds },
      type: 'task',
      ...taskDateFilter,
    })
      .select('createdBy status')
      .lean(),

    // Meetings (type: "meeting")
    CRMTasks.find({
      organization: new mongoose.Types.ObjectId(orgId),
      createdBy: { $in: agentIds },
      type: 'meeting',
      ...taskDateFilter,
    })
      .select('createdBy status')
      .lean(),

    // Quotes
    CRMQuote.find({
      organization: new mongoose.Types.ObjectId(orgId),
      employee: { $in: employeeIds },
      ...crmDateFilter,
    })
      .select('employee total status')
      .lean(),

    // Interests
    CRMInterests.find({
      organization: new mongoose.Types.ObjectId(orgId),
      ...crmDateFilter,
    })
      .select('lead contact')
      .lean(),
  ]);

  // Group data by agent/employee
  const agentStats = new Map();

  // Initialize stats for all agents
  agentIds.forEach((agentId) => {
    agentStats.set(agentId.toString(), {
      taskCount: 0,
      meetingCount: 0,
      quoteCount: 0,
      interestCount: 0,
      quoteValue: 0,
      completedTasks: 0,
      completedMeetings: 0,
    });
  });

  // Aggregate tasks
  tasks.forEach((task) => {
    const agentId = task.createdBy.toString();
    if (agentStats.has(agentId)) {
      const stats = agentStats.get(agentId);
      stats.taskCount++;
      if (task.status === 'completed') {
        stats.completedTasks++;
      }
    }
  });

  // Aggregate meetings
  meetings.forEach((meeting) => {
    const agentId = meeting.createdBy.toString();
    if (agentStats.has(agentId)) {
      const stats = agentStats.get(agentId);
      stats.meetingCount++;
      if (meeting.status === 'completed') {
        stats.completedMeetings++;
      }
    }
  });

  // Aggregate quotes
  quotes.forEach((quote) => {
    const employeeId = quote.employee.toString();
    const agentId = employeeToAgent.get(employeeId);
    if (agentId && agentStats.has(agentId.toString())) {
      const stats = agentStats.get(agentId.toString());
      stats.quoteCount++;
      stats.quoteValue += quote.total || 0;
    }
  });

  // Aggregate interests
  // Note: Interests don't have direct employee/agent reference
  // We'll need to match through leads/contacts if needed
  // For now, we'll track total interests per organization
  const totalInterests = interests.length;

  // Build employee reports
  const employeeReports = [];

  for (const employee of employees) {
    const agentId = employeeToAgent.get(employee._id.toString());
    const stats = agentId
      ? agentStats.get(agentId.toString())
      : {
          taskCount: 0,
          meetingCount: 0,
          quoteCount: 0,
          interestCount: 0,
          quoteValue: 0,
          completedTasks: 0,
          completedMeetings: 0,
        };

    // Get department info
    const departmentInfo = employee.department
      ? await mongoose
          .model('EmployeeDepartment')
          .findById(employee.department)
          .select('name')
          .lean()
      : null;

    // Calculate performance metrics
    // Task completion rate (0-100)
    const taskCompletionRate =
      stats.taskCount > 0 ? (stats.completedTasks / stats.taskCount) * 100 : 0;

    // Meeting completion rate (0-100)
    const meetingCompletionRate =
      stats.meetingCount > 0
        ? (stats.completedMeetings / stats.meetingCount) * 100
        : 0;

    // Activity score based on number of activities
    const totalActivities =
      stats.taskCount + stats.meetingCount + stats.quoteCount;
    const activityScore = Math.min(100, totalActivities * 5); // 20 activities = 100%

    // Quote value score (normalize to 100)
    const quoteValueScore = Math.min(100, stats.quoteValue / 10000); // 1M = 100%

    // Calculate overall performance (weighted average)
    // Task completion: 25%, Meeting completion: 25%, Activity: 25%, Quote value: 25%
    const overallPerformance =
      taskCompletionRate * 0.25 +
      meetingCompletionRate * 0.25 +
      activityScore * 0.25 +
      quoteValueScore * 0.25;

    employeeReports.push({
      employeeId: employee._id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      department: departmentInfo ? departmentInfo.name : 'N/A',
      departmentId: employee.department,
      designation: employee.designation || 'N/A',
      agentId: agentId || null,
      taskCount: stats.taskCount,
      completedTasks: stats.completedTasks,
      meetingCount: stats.meetingCount,
      completedMeetings: stats.completedMeetings,
      quoteCount: stats.quoteCount,
      quoteValue: Math.round(stats.quoteValue * 100) / 100,
      interestCount: stats.interestCount,
      taskCompletionRate: `${Math.round(taskCompletionRate * 100) / 100}%`,
      meetingCompletionRate: `${
        Math.round(meetingCompletionRate * 100) / 100
      }%`,
      performance: `${Math.round(overallPerformance * 100) / 100}%`,
      performanceValue: Math.round(overallPerformance * 100) / 100,
    });
  }

  // Sort by performance value (highest first)
  employeeReports.sort((a, b) => b.performanceValue - a.performanceValue);

  // Calculate summary statistics
  const totalQuoteValue = employeeReports.reduce(
    (sum, emp) => sum + emp.quoteValue,
    0
  );
  const totalTasks = employeeReports.reduce(
    (sum, emp) => sum + emp.taskCount,
    0
  );
  const totalMeetings = employeeReports.reduce(
    (sum, emp) => sum + emp.meetingCount,
    0
  );
  const totalQuotes = employeeReports.reduce(
    (sum, emp) => sum + emp.quoteCount,
    0
  );

  const summary = {
    totalEmployees: employeeReports.length,
    averagePerformance:
      employeeReports.length > 0
        ? `${
            Math.round(
              (employeeReports.reduce(
                (sum, emp) => sum + emp.performanceValue,
                0
              ) /
                employeeReports.length) *
                100
            ) / 100
          }%`
        : '0.00%',
    totalTasks,
    totalMeetings,
    totalQuotes,
    totalQuoteValue: Math.round(totalQuoteValue * 100) / 100,
    totalInterests,
  };

  const filterInfo = {
    departments: employee_department ? employee_department.split(',') : null,
    dateRange: dateFilter.start
      ? {
          startDate: dateFilter.start,
          endDate: dateFilter.end,
        }
      : null,
  };

  res.status(200).json({
    success: true,
    message: 'Contact created successfully',
    data: {
      success: true,
      filters: filterInfo,
      summary,
      data: employeeReports,
    },
  });
});
module.exports = {
  getPerformance,
};
