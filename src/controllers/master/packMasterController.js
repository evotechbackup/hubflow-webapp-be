const { asyncHandler } = require('../../middleware');
const PackMaster = require('../../models/master/PackMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllPackMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const packMasters = await PackMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Pack retrieved successfully',
    data: packMasters,
  });
});

const getPackMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const packMaster = await PackMaster.findById(id);

  if (!packMaster) {
    throw new NotFoundError('Pack not found');
  }

  res.status(200).json({
    success: true,
    message: 'Pack retrieved successfully',
    data: packMaster,
  });
});

const createPackMaster = asyncHandler(async (req, res) => {
  const { packCode, packName, ediCode, status, remarks, organization, company } =
    req.body;

  if (!packName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const packMaster = await PackMaster.create({
    packCode,
    packName,
    ediCode,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Pack created successfully',
    data: packMaster,
  });
});

const updatePackMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const packMaster = await PackMaster.findById(id);

  if (!packMaster) {
    throw new NotFoundError('Pack not found');
  }

  const updatedPackMaster = await PackMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Pack updated successfully',
    data: updatedPackMaster,
  });
});

const deletePackMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const packMaster = await PackMaster.findById(id);

  if (!packMaster) {
    throw new NotFoundError('Pack not found');
  }

  await PackMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Pack deleted successfully',
  });
});

module.exports = {
  getAllPackMaster,
  getPackMaster,
  createPackMaster,
  updatePackMaster,
  deletePackMaster,
};
