const { asyncHandler } = require('../../middleware');
const ActivityMaster = require('../../models/master/ActivityMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllActivityMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const activityMasters = await ActivityMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Activities retrieved successfully',
    data: activityMasters,
  });
});

const getActivityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const activityMaster = await ActivityMaster.findById(id);

  if (!activityMaster) {
    throw new NotFoundError('Activity not found');
  }

  res.status(200).json({
    success: true,
    message: 'Activity retrieved successfully',
    data: activityMaster,
  });
});

const createActivityMaster = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    type,
    status,
    department,
    previousActivity,
    nextActivity,
    remarks,
    organization,
    company,
  } = req.body;

  if (!name || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const activityMaster = await ActivityMaster.create({
    code,
    name,
    type,
    status,
    department,
    previousActivity,
    nextActivity,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Activity created successfully',
    data: activityMaster,
  });
});

const updateActivityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const activityMaster = await ActivityMaster.findById(id);

  if (!activityMaster) {
    throw new NotFoundError('Activity not found');
  }

  const updatedActivity = await ActivityMaster.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Activity updated successfully',
    data: updatedActivity,
  });
});

const deleteActivityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const activityMaster = await ActivityMaster.findById(id);

  if (!activityMaster) {
    throw new NotFoundError('Activity not found');
  }

  await ActivityMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Activity deleted successfully',
  });
});

module.exports = {
  getAllActivityMaster,
  getActivityMaster,
  createActivityMaster,
  updateActivityMaster,
  deleteActivityMaster,
};
