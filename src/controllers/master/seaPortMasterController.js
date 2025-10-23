const { asyncHandler } = require('../../middleware');
const SeaPortMaster = require('../../models/master/SeaPortMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllSeaPortMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const portMasters = await SeaPortMaster.find({
    organization: orgid,
  })
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName');

  res.status(200).json({
    success: true,
    message: 'Sea Port retrieved successfully',
    data: portMasters,
  });
});

const getSeaPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const portMaster = await SeaPortMaster.findById(id)
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName');

  if (!portMaster) {
    throw new NotFoundError('Sea Port not found');
  }

  res.status(200).json({
    success: true,
    message: 'Sea Port retrieved successfully',
    data: portMaster,
  });
});

const createSeaPortMaster = asyncHandler(async (req, res) => {
  const {
    seaPortCode,
    seaPortName,
    ediCode,
    blNumber,
    iataCode,
    isoCode,
    blNoPrefix,
    country,
    region,
    zone,
    type,
    status,
    remarks,
    organization,
    company,
  } = req.body;

  const countryId = country === '' ? null : country;
  const regionId = region === '' ? null : region;
  const zoneId = zone === '' ? null : zone;

  if (!seaPortName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const portMaster = await SeaPortMaster.create({
    seaPortCode,
    seaPortName,
    ediCode,
    blNumber,
    iataCode,
    isoCode,
    blNoPrefix,
    country: countryId,
    region: regionId,
    zone: zoneId,
    type,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Sea Port created successfully',
    data: portMaster,
  });
});

const updateSeaPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const portMaster = await SeaPortMaster.findById(id);

  if (!portMaster) {
    throw new NotFoundError('Sea Port not found');
  }

  const updatedPortMaster = await SeaPortMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Sea Port updated successfully',
    data: updatedPortMaster,
  });
});

const deleteSeaPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const portMaster = await SeaPortMaster.findById(id);

  if (!portMaster) {
    throw new NotFoundError('Sea Port not found');
  }

  await SeaPortMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Sea Port deleted successfully',
  });
});

module.exports = {
  getAllSeaPortMaster,
  getSeaPortMaster,
  createSeaPortMaster,
  updateSeaPortMaster,
  deleteSeaPortMaster,
};
