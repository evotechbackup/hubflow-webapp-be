const { asyncHandler } = require('../../middleware');
const AirPortMaster = require('../../models/master/AirPortMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllAirPortMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const portMasters = await AirPortMaster.find({
    organization: orgid,
  })
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName');

  res.status(200).json({
    success: true,
    message: 'Land Port retrieved successfully',
    data: portMasters,
  });
});

const getAirPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const portMaster = await AirPortMaster.findById(id)
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName');

  if (!portMaster) {
    throw new NotFoundError('Air Port not found');
  }

  res.status(200).json({
    success: true,
    message: 'Air Port retrieved successfully',
    data: portMaster,
  });
});

const createAirPortMaster = asyncHandler(async (req, res) => {
  const {
    airPortCode,
    airPortName,
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

  if (!airPortName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const portMaster = await AirPortMaster.create({
    airPortCode,
    airPortName,
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
    message: 'Air Port created successfully',
    data: portMaster,
  });
});

const updateAirPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const portMaster = await AirPortMaster.findById(id);

  if (!portMaster) {
    throw new NotFoundError('Air Port not found');
  }

  const updatedPortMaster = await AirPortMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Air Port updated successfully',
    data: updatedPortMaster,
  });
});

const deleteAirPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const portMaster = await AirPortMaster.findById(id);

  if (!portMaster) {
    throw new NotFoundError('Air Port not found');
  }

  await AirPortMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Air Port deleted successfully',
  });
});

module.exports = {
  getAllAirPortMaster,
  getAirPortMaster,
  createAirPortMaster,
  updateAirPortMaster,
  deleteAirPortMaster,
};
