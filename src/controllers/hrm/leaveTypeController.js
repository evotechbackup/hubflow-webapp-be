// leaveTypeRoutes.js
const LeaveType = require('../../models/hrm/leaveManagement/LeaveType');
const Organization = require('../../models/auth/Organization');
const { asyncHandler } = require('../../middleware/errorHandler');

const createLeaveType = asyncHandler(async (req, res) => {
  const {
    departmentId,
    description,
    leaveType,
    maxDuration,
    leaveApplyCondition,
    company,
    organization,
  } = req.body;
  const newLeaveType = new LeaveType({
    departmentId,
    description,
    leaveType,
    maxDuration,
    leaveApplyCondition,
    company,
    organization,
  });
  const saveLeaveType = await newLeaveType.save();
  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'create',
  //     type: 'leaveType',
  //     actionId: saveLeaveType.leaveType,
  //     organization: organization,
  //     company: company,
  //   });
  res.status(201).json({
    success: true,
    message: 'Leave created successfully',
    data: saveLeaveType,
  });
});

const getAllLeaveType = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const leaveTypes = await LeaveType.find({
    organization: orgid,
    valid: true,
  })
    .populate('departmentId', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: 'Leave Types retrieved successfully',
    data: leaveTypes,
  });
});

const getLeaveById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const leaveType = await LeaveType.findById(id).populate(
    'departmentId',
    'name'
  );
  if (!leaveType) {
    throw new Error('Leave request not found');
  }
  res.status(200).json({
    success: true,
    message: 'Leave Type retrieved successfully',
    data: leaveType,
  });
});

const updateLeaveType = asyncHandler(async (req, res) => {
  const {
    departmentId,
    description,
    leaveType,
    maxDuration,
    leaveApplyCondition,
  } = req.body;
  const updatedLeaveType = await LeaveType.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        departmentId,
        description,
        leaveType,
        maxDuration,
        leaveApplyCondition,
      },
    },
    { new: true }
  );

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   type: 'leaveType',
  //   actionId: updatedLeaveType.leaveType,
  //   organization: updatedLeaveType.organization,
  //   company: updatedLeaveType.company,
  // });
  res.status(200).json({
    success: true,
    message: 'Leave Type updated successfully',
    data: updatedLeaveType,
  });
});

const getLeaveTypeByDepartmentId = asyncHandler(async (req, res) => {
  const { orgid, departmentId } = req.params;

  const leaveTypes = await LeaveType.find({
    organization: orgid,
    departmentId,
    valid: true,
  }).sort({ leaveType: 1 });

  res.status(200).json({
    success: true,
    message: 'Leave Type retrieved successfully',
    data: leaveTypes,
  });
});

const addLeaveTypeToOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const updatedOrgWithLeaveType = await Organization.findByIdAndUpdate(
    orgid,
    {
      $push: { leaveType: req.body.leaveType },
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Leave Type retrieved successfully',
    data: updatedOrgWithLeaveType,
  });
});

const getLeaveTypesByOrganizationId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const org = await Organization.findById(orgid);
  res.status(200).json({
    success: true,
    message: 'Leave Type retrieved successfully',
    data: org.leaveType,
  });
});

const invalidateLeaveType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invalidLeaveType = await LeaveType.findByIdAndUpdate(id, {
    valid: false,
  });
  res.status(200).json({
    success: true,
    message: 'Leave Type invalidated successfully',
    data: invalidLeaveType,
  });
});

module.exports = {
  createLeaveType,
  getAllLeaveType,
  getLeaveById,
  updateLeaveType,
  getLeaveTypeByDepartmentId,
  addLeaveTypeToOrganization,
  getLeaveTypesByOrganizationId,
  invalidateLeaveType,
};
