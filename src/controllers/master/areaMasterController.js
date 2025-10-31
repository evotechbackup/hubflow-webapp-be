const { asyncHandler } = require('../../middleware');
const AreaMaster = require('../../models/master/AreaMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllAreaMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const areaMasters = await AreaMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Areas retrieved successfully',
    data: areaMasters,
  });
});

const getAreaMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const areaMaster = await AreaMaster.findById(id);

  if (!areaMaster) {
    throw new NotFoundError('Area not found');
  }

  res.status(200).json({
    success: true,
    message: 'Area retrieved successfully',
    data: areaMaster,
  });
});

const createAreaMaster = asyncHandler(async (req, res) => {
  const { areaCode, areaName, status, remarks, organization, company } =
    req.body;

  if (!areaName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const areaMaster = await AreaMaster.create({
    areaCode,
    areaName,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Area created successfully',
    data: areaMaster,
  });
});

const updateAreaMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const areaMaster = await AreaMaster.findById(id);

  if (!areaMaster) {
    throw new NotFoundError('Area not found');
  }

  const updatedAreaMaster = await AreaMaster.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Area updated successfully',
    data: updatedAreaMaster,
  });
});

const deleteAreaMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const areaMaster = await AreaMaster.findById(id);

  if (!areaMaster) {
    throw new NotFoundError('Area not found');
  }

  await AreaMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Area deleted successfully',
  });
});

module.exports = {
  getAllAreaMaster,
  getAreaMaster,
  createAreaMaster,
  updateAreaMaster,
  deleteAreaMaster,
};
