const { asyncHandler } = require('../../middleware');
const ZoneMaster = require('../../models/master/ZoneMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllZoneMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const zoneMasters = await ZoneMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Zone retrieved successfully',
    data: zoneMasters,
  });
});

const getZoneMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const zoneMaster = await ZoneMaster.findById(id);

  if (!zoneMaster) {
    throw new NotFoundError('Zone not found');
  }

  res.status(200).json({
    success: true,
    message: 'Zone retrieved successfully',
    data: zoneMaster,
  });
});

const createZoneMaster = asyncHandler(async (req, res) => {
  const { zoneCode, zoneName, status, remarks, organization, company } =
    req.body;

  if (!zoneName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const zoneMaster = await ZoneMaster.create({
    zoneCode,
    zoneName,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Zone created successfully',
    data: zoneMaster,
  });
});

const updateZoneMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const zoneMaster = await ZoneMaster.findById(id);

  if (!zoneMaster) {
    throw new NotFoundError('Zone not found');
  }

  const updatedZoneMaster = await ZoneMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Zone updated successfully',
    data: updatedZoneMaster,
  });
});

const deleteZoneMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const zoneMaster = await ZoneMaster.findById(id);

  if (!zoneMaster) {
    throw new NotFoundError('Zone not found');
  }

  await ZoneMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Zone deleted successfully',
  });
});

module.exports = {
  getAllZoneMaster,
  getZoneMaster,
  createZoneMaster,
  updateZoneMaster,
  deleteZoneMaster,
};
