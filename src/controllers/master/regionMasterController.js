const { asyncHandler } = require('../../middleware');
const RegionMaster = require('../../models/master/RegionMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllRegionMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const regionMasters = await RegionMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Regions retrieved successfully',
    data: regionMasters,
  });
});

const getRegionMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const regionMaster = await RegionMaster.findById(id);

  if (!regionMaster) {
    throw new NotFoundError('Region not found');
  }

  res.status(200).json({
    success: true,
    message: 'Region retrieved successfully',
    data: regionMaster,
  });
});

const createRegionMaster = asyncHandler(async (req, res) => {
  const { regionCode, regionName, status, remarks, organization, company } =
    req.body;

  if (!regionName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const regionMaster = await RegionMaster.create({
    regionCode,
    regionName,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Region created successfully',
    data: regionMaster,
  });
});

const updateRegionMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const regionMaster = await RegionMaster.findById(id);

  if (!regionMaster) {
    throw new NotFoundError('Region not found');
  }

  const updatedRegionMaster = await RegionMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Region updated successfully',
    data: updatedRegionMaster,
  });
});

const deleteRegionMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const regionMaster = await RegionMaster.findById(id);

  if (!regionMaster) {
    throw new NotFoundError('Region not found');
  }

  await RegionMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Region deleted successfully',
  });
});

module.exports = {
  getAllRegionMaster,
  getRegionMaster,
  createRegionMaster,
  updateRegionMaster,
  deleteRegionMaster,
};
