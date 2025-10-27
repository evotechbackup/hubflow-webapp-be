const EmployeeReport = require('../../models/hrm/Reports/EmployeeReport');
const EmployeeReportSubmission = require('../../models/hrm/Reports/EmployeeReportSubmission');
const mongoose = require('mongoose');
const Employee = require('../../models/hrm/Employee');
const Payroll = require('../../models/hrm/Payroll');
const Leave = require('../../models/hrm/leaveManagement/Leave');
const { asyncHandler } = require('../../middleware/errorHandler');
// Get all employee reports for a specific organization
const getAllEmployeeReports = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const employeeReports = await EmployeeReport.find({
    organization: orgid,
  }).populate('department', ['name']);
  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: employeeReports,
  });
});

// Create a new employee report
const createEmployeeReport = asyncHandler(async (req, res) => {
  const newEmployeeReport = new EmployeeReport(req.body);
  const savedEmployeeReport = await newEmployeeReport.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   type: 'employeeReportForm',
  //   actionId: savedEmployeeReport.title,
  //   organization: savedEmployeeReport.organization,
  //   company: savedEmployeeReport.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: savedEmployeeReport,
  });
});
//get by id
const getEmployeeReportById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const employeeReport = await EmployeeReport.findById(id);
  if (!employeeReport) {
    throw new Error('Employee report not found');
  }
  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: employeeReport,
  });
});

//get forms based on dept id and role
const getFormsBasedOnDeptIdAndRole = asyncHandler(async (req, res) => {
  const { deptId, role } = req.params;
  const employeeReports = await EmployeeReport.find({
    department: deptId,
    role,
  }).populate('questions');

  res.status(200).json({
    success: true,
    message: 'Employee report retrieved successfully',
    data: employeeReports,
  });
});

const getSubmissionCount = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const submissionCounts = await EmployeeReportSubmission.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
      },
    },
    {
      $group: {
        _id: '$form',
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: 'employeereports', // Name of the EmployeeReport collection
        localField: '_id',
        foreignField: '_id',
        as: 'report',
      },
    },
    {
      $addFields: {
        report: { $arrayElemAt: ['$report', 0] },
      },
    },
    {
      $lookup: {
        from: 'employeedepartments', // Name of the EmployeeDepartment collection
        localField: 'report.department',
        foreignField: '_id',
        as: 'department',
      },
    },
    {
      $addFields: {
        department: { $arrayElemAt: ['$department', 0] },
      },
    },
    {
      $project: {
        _id: 1,
        count: 1,
        'report.title': 1,
        'report.description': 1,
        'report.color': 1,
        'report.department': 1,
        'report.role': 1,
        'report.organization': 1,
        'report.company': 1,
        'report.createdAt': 1,
        'report.updatedAt': 1,
        'department.name': 1,
        'department.description': 1,
        'department.createdAt': 1,
        'department.updatedAt': 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: submissionCounts,
  });
});

const getAnalytics = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    startDate,
    endDate,
    employee_name,
    employee_contract,
    employee_type,
    employee_department,
    employee_groups,
    employee_teams,
    region,
  } = req.body;

  // --- Step 1: Define date range
  let start;
  if (startDate) {
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
  } else {
    const firstPayroll = await Payroll.findOne({ organization: orgid })
      .sort({ createdAt: 1 })
      .select('createdAt');
    start = new Date(firstPayroll?.createdAt || new Date());
    start.setHours(0, 0, 0, 0);
  }

  const end = new Date(endDate || new Date());
  end.setHours(23, 59, 59, 999);

  // --- Step 2: Filter employees
  let filteredEmployeeIds = null;

  const matchCriteria = {
    organization: new mongoose.Types.ObjectId(orgid),
    isDeleted: false,
    createdAt: { $gte: start, $lte: end },
  };

  if (
    employee_name?.length ||
    employee_contract?.length ||
    employee_type?.length ||
    employee_department?.length ||
    employee_groups?.length ||
    employee_teams?.length ||
    region?.length
  ) {
    const empFilter = { organization: new mongoose.Types.ObjectId(orgid) };

    if (employee_name?.length)
      empFilter._id = {
        $in: employee_name.map((id) => new mongoose.Types.ObjectId(id)),
      };

    if (employee_contract?.length)
      empFilter.contractType = { $in: employee_contract };

    if (employee_type?.length) empFilter.contractType = { $in: employee_type };

    if (employee_department?.length)
      empFilter.department = {
        $in: employee_department.map((d) => new mongoose.Types.ObjectId(d)),
      };

    if (employee_groups?.length)
      empFilter.employeeGroup = {
        $in: employee_groups.map((g) => new mongoose.Types.ObjectId(g)),
      };

    if (employee_teams?.length)
      empFilter.employeeTeam = { $in: employee_teams };

    if (region?.length) empFilter['currentAddress.city'] = { $in: region };

    filteredEmployeeIds = await Employee.find(empFilter).distinct('_id');

    matchCriteria['team.employee'] = { $in: filteredEmployeeIds };

    if (!filteredEmployeeIds.length)
      res.status(200).json({
        success: true,
        message: 'Leave retrieved successfully',
        data: { monthlyData: [], summary: {} },
      });
  }

  // --- Step 3: Base match queries
  const baseMatch = {
    organization: new mongoose.Types.ObjectId(orgid),
    createdAt: { $gte: start, $lte: end },
  };

  const payrollMatch = { ...baseMatch };
  const leaveMatch = { ...baseMatch };

  if (filteredEmployeeIds?.length) {
    payrollMatch.employeeId = { $in: filteredEmployeeIds };
    leaveMatch.employeeId = { $in: filteredEmployeeIds };
  }

  // --- Step 4: Payroll Analytics
  const payrollData = await Payroll.aggregate([
    { $match: payrollMatch },
    {
      $addFields: {
        month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      },
    },
    {
      $group: {
        _id: { month: '$month', type: '$type' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  // --- Step 5: Leave Analytics
  const leaveData = await Leave.aggregate([
    { $match: leaveMatch },
    {
      $addFields: {
        month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
      },
    },
    {
      $group: {
        _id: { month: '$month', status: '$status' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.month': 1 } },
  ]);

  const taskCounts = {};

  // --- Step 7: Transform Payroll Data
  const payrollCounts = {};
  for (const { _id, count } of payrollData) {
    const { month, type } = _id;
    if (!payrollCounts[month])
      payrollCounts[month] = { full: 0, advance: 0, loan: 0 };
    if (['full', 'advance', 'loan'].includes(type))
      payrollCounts[month][type] = count;
  }

  // --- Step 8: Transform Leave Data
  const leaveCounts = {};
  for (const { _id, count } of leaveData) {
    const { month, status } = _id;
    if (!leaveCounts[month])
      leaveCounts[month] = { approved: 0, rejected: 0, pending: 0 };
    if (['approved', 'rejected', 'pending'].includes(status))
      leaveCounts[month][status] = count;
  }

  // --- Step 10: Month labels
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

  // --- Step 11: Combine Monthly Data
  const monthlyData = monthLabels.map((month) => ({
    month,
    fullPayrollCount: payrollCounts[month]?.full || 0,
    advanceCount: payrollCounts[month]?.advance || 0,
    loanCount: payrollCounts[month]?.loan || 0,
    totalPayrollDocs:
      (payrollCounts[month]?.full || 0) +
      (payrollCounts[month]?.advance || 0) +
      (payrollCounts[month]?.loan || 0),
    totalTasks: taskCounts[month]?.total || 0, // ✅ only total task count
    leaveApproved: leaveCounts[month]?.approved || 0,
    leavePending: leaveCounts[month]?.pending || 0,
    leaveRejected: leaveCounts[month]?.rejected || 0,
    totalLeaves:
      (leaveCounts[month]?.approved || 0) +
      (leaveCounts[month]?.pending || 0) +
      (leaveCounts[month]?.rejected || 0),
  }));

  // --- Step 12: Summary Totals
  const summary = {
    totalFullPayroll: Object.values(payrollCounts).reduce(
      (a, b) => a + (b.full || 0),
      0
    ),
    totalAdvance: Object.values(payrollCounts).reduce(
      (a, b) => a + (b.advance || 0),
      0
    ),
    totalLoan: Object.values(payrollCounts).reduce(
      (a, b) => a + (b.loan || 0),
      0
    ),
    totalTasks: Object.values(taskCounts).reduce(
      (a, b) => a + (b.total || 0),
      0
    ),
    totalLeaves: Object.values(leaveCounts).reduce(
      (a, b) => a + (b.approved || 0) + (b.pending || 0) + (b.rejected || 0),
      0
    ),
  };
  summary.totalPayrollDocs =
    summary.totalFullPayroll + summary.totalAdvance + summary.totalLoan;

  // --- Step 13: Response
  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: { monthlyData, summary },
  });
});

module.exports = {
  getAllEmployeeReports,
  createEmployeeReport,
  getEmployeeReportById,
  getFormsBasedOnDeptIdAndRole,
  getSubmissionCount,
  getAnalytics,
};
