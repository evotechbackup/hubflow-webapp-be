const Leave = require('../../models/hrm/leaveManagement/Leave');
const { asyncHandler } = require('../../middleware/errorHandler');
// const {
//   findNextApprovalLevelAndNotify,
//   ifHasApproval,
// } = require('../../../utilities/approvalUtils');
// const { createActivityLog } = require('../../../utilities/logUtils');

const monthNames = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const createLeave = asyncHandler(async (req, res) => {
  const {
    employeeId,
    jobRoleId,
    departmentId,
    leaveType,
    startDate,
    agent,
    endDate,
    month = new Date(),
    reason,
    status,
    company,
    organization,
    docAttached,
  } = req.body;

  const dateUsingMonth = new Date(month);

  const currentMonth = monthNames[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonth}-${currentYear}`;

  // const hasApproval = await ifHasApproval('leavemanagement', organization);

  const newLeave = new Leave({
    employeeId,
    jobRoleId,
    departmentId,
    leaveType,
    startDate,
    endDate,
    month: monthStart,
    reason,
    agent,
    status,
    company,
    organization,
    approval: 'pending',
    docAttached,
  });

  const savedLeave = await newLeave.save();

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'create',
  //     type: 'leave',
  //     actionId: employeeId,
  //     organization: organization,
  //     company: company,
  //   });

  //   if (hasApproval) {
  //     await findNextApprovalLevelAndNotify(
  //       'leavemanagement',
  //       'pending',
  //       savedLeave.organization,
  //       savedLeave.company,
  //       '',
  //       'Leave',
  //       'leave-approval',
  //       savedLeave._id
  //     );
  //   }

  res.status(201).json({
    success: true,
    message: 'Leave created successfully',
    data: savedLeave,
  });
});

const getAllLeave = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const leave = await Leave.find({
    organization: orgid,
    valid: true,
  })
    .populate('employeeId')
    .populate('departmentId')
    .populate('leaveType');

  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: leave,
  });
});

const getSpecificLeaveById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const leave = await Leave.findById(id)
    .populate('employeeId', [
      'firstName',
      'lastName',
      'employeeId',
      'dateOfJoining',
    ])
    .populate('leaveType', ['leaveType', 'maxDuration'])
    .populate('departmentId')
    .populate('agent', [
      'signature',
      'fullName',
      'email',
      'phone',
      'profileType',
    ])
    .populate('verifiedBy', [
      'signature',
      'fullName',
      'email',
      'phone',
      'profileType',
    ])
    .populate('reviewedBy', [
      'signature',
      'fullName',
      'email',
      'phone',
      'profileType',
    ])
    .populate('approvedBy1', [
      'signature',
      'fullName',
      'email',
      'phone',
      'profileType',
    ])
    .populate('approvedBy2', [
      'signature',
      'fullName',
      'email',
      'phone',
      'profileType',
    ])
    .populate('organization', [
      'letterheadArabicName',
      'letterheadName',
      'organizationLogo',
      'arabicName',
      'name',
      'cr',
      'vat',
      'mobileNumber',
      'organizationEmail',
      'webURL',
      'pOBox',
      'organizationAddress',
      'procurementColor',
      'organizationSeal',
      'organizationSignature',
    ]);
  if (!leave) {
    throw new Error('Leave request not found');
  }
  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: leave,
  });
});

const updateApprovedRejectLeave = asyncHandler(async (req, res) => {
  const { month, startDate, endDate, reason, docAttached, leaveType } =
    req.body;

  const dateUsingMonth = new Date(month);
  const currentMonths = monthNames[dateUsingMonth.getMonth()];
  const currentYear = dateUsingMonth.getFullYear();
  const monthStart = `${currentMonths}-${currentYear}`;

  const leave = await Leave.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        month: monthStart,
        startDate,
        endDate,
        reason,
        docAttached,
        leaveType,
      },
    },
    { new: true }
  );
  if (!leave) {
    throw new Error('Leave request not found');
  }

  //   const hasApproval = await ifHasApproval(
  //     'leavemanagement',
  //     leave.organization
  //   );

  leave.verifiedBy = null;
  leave.approvedBy1 = null;
  leave.approvedBy2 = null;
  leave.verifiedAt = null;
  leave.approvedAt1 = null;
  leave.approvedAt2 = null;
  leave.reviewedBy = null;
  leave.reviewedAt = null;
  leave.acknowledgedBy = null;
  leave.acknowledgedAt = null;
  leave.approval = 'none';

  await leave.save();

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'update',
  //     type: 'leave',
  //     actionId: leave.id,
  //     organization: leave.organization,
  //     company: leave.company,
  //   });

  res.status(200).json({
    success: true,
    message: 'Leave updated successfully',
    data: leave,
  });
});

const invalidateLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findByIdAndUpdate(
    req.params.id,
    { $set: { valid: false } },
    { new: true }
  );
  if (!leave) {
    throw new Error('Leave request not found');
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'invalidate',
  //   type: 'leave',
  //   actionId: leave.id,
  //   organization: leave.organization,
  //   company: leave.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: leave,
  });
});

const deleteLeave = asyncHandler(async (req, res) => {
  const deletedLeave = await Leave.findByIdAndDelete(req.params.id);
  if (!deletedLeave) {
    throw new Error('Leave request not found');
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'delete',
  //   type: 'leave',
  //   actionId: deletedLeave.id,
  //   organization: deletedLeave.organization,
  //   company: deletedLeave.company,
  // });

  res.status(200).json({
    success: true,
    message: 'Leave deleted successfully',
    data: deletedLeave,
  });
});

const getLeaveById = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id)
    .populate('employeeId')
    .populate('departmentId');
  if (!leave) {
    throw new Error('Leave request not found');
  }

  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: leave,
  });
});

const updateLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findByIdAndUpdate(
    req.params.id,
    { $set: { status: req.body.status } },
    { new: true }
  );
  if (!leave) {
    throw new Error('Leave request not found');
  }

  res.status(200).json({
    success: true,
    message: 'Leave updated successfully',
    data: leave,
  });
});

const getLeavesByMonth = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const getleaves = await Leave.find({
    organization: orgid,
    valid: true,
  });

  const leaves = getleaves.reduce((acc, leave) => {
    const { month } = leave;
    const index = acc.findIndex((item) => item._id === month);
    if (index === -1) {
      acc.push({
        _id: month,
        count: 1,
      });
    } else {
      acc[index].count += 1;
    }
    return acc;
  }, []);

  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: leaves,
  });
});

const getLeavesByMonthAndYear = asyncHandler(async (req, res) => {
  const { month, orgid } = req.params;
  const leaves = await Leave.find({
    month: { $in: month },
    organization: orgid,
    valid: true,
  })
    .populate('employeeId')
    .populate('departmentId')
    .populate('leaveType')
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: leaves,
  });
});

const getLeaveByEmployeeId = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const leaveDetails = await Leave.find({
    employeeId: { $in: employeeId },
    valid: true,
  })
    .populate('leaveType employeeId departmentId company organization')
    .sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: leaveDetails,
  });
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id, agentid } = req.params;
  const { approval, approvalComment } = req.body;

  const leave = await Leave.findById(id);

  if (!leave) {
    throw new Error('Leave not found');
  }

  const resetFields = () => {
    leave.verifiedBy = null;
    leave.approvedBy1 = null;
    leave.approvedBy2 = null;
    leave.verifiedAt = null;
    leave.approvedAt1 = null;
    leave.approvedAt2 = null;
    leave.reviewedBy = null;
    leave.reviewedAt = null;
    leave.acknowledgedBy = null;
    leave.acknowledgedAt = null;
  };

  leave.approval = approval;

  switch (approval) {
    case 'reviewed':
      leave.reviewedBy = agentid;
      leave.reviewedAt = new Date();
      leave.verifiedBy = null;
      leave.verifiedAt = null;
      leave.acknowledgedBy = null;
      leave.acknowledgedAt = null;
      break;

    case 'verified':
      leave.verifiedBy = agentid;
      leave.verifiedAt = new Date();
      leave.acknowledgedBy = null;
      leave.acknowledgedAt = null;
      break;

    case 'acknowledged':
      leave.acknowledgedBy = agentid;
      leave.acknowledgedAt = new Date();
      break;

    case 'approved1':
      leave.approvedBy1 = agentid;
      leave.approvedAt1 = new Date();
      break;

    case 'approved2':
      leave.approvedBy2 = agentid;
      leave.approvedAt2 = new Date();
      break;

    case 'correction':
    case 'rejected':
      leave.approvalComment = approvalComment || null;
      resetFields();
      break;

    default:
      break;
  }

  await leave.save();

  // await findNextApprovalLevelAndNotify(
  //   'leavemanagement',
  //   approval,
  //   leave.organization,
  //   leave.company,
  //   '',
  //   'Leave',
  //   'leave-approval',
  //   leave._id
  // );

  // await createActivityLog({
  //   userId: req._id,
  //   action: approval?.includes('approve') ? 'approve' : approval,
  //   type: 'leave',
  //   actionId: leave.id,
  //   organization: leave.organization,
  //   company: leave.company,
  // });
  res.status(200).json({
    success: true,
    message: 'Leave retrieved successfully',
    data: leave,
  });
});

module.exports = {
  createLeave,
  getAllLeave,
  getLeaveById,
  updateLeave,
  updateApproval,
  getLeaveByEmployeeId,
  getLeavesByMonth,
  getLeavesByMonthAndYear,
  invalidateLeave,
  deleteLeave,
  getSpecificLeaveById,
  updateApprovedRejectLeave,
};
