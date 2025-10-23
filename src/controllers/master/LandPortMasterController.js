const { asyncHandler } = require('../../middleware');
const LandPortMaster = require('../../models/master/LandPortMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllLandPortMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const portMasters = await LandPortMaster.find({
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

const getLandPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const portMaster = await LandPortMaster.findById(id)
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName');

  if (!portMaster) {
    throw new NotFoundError('Land Port not found');
  }

  res.status(200).json({
    success: true,
    message: 'Land Port retrieved successfully',
    data: portMaster,
  });
});

const createLandPortMaster = asyncHandler(async (req, res) => {
  const {
    landPortCode,
    landPortName,
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

  if (!landPortName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const portMaster = await LandPortMaster.create({
    landPortCode,
    landPortName,
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
    message: 'Land Port created successfully',
    data: portMaster,
  });
});

const updateLandPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const portMaster = await LandPortMaster.findById(id);

  if (!portMaster) {
    throw new NotFoundError('Land Port not found');
  }

  const updatedPortMaster = await LandPortMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Land Port updated successfully',
    data: updatedPortMaster,
  });
});

const deleteLandPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const portMaster = await LandPortMaster.findById(id);

  if (!portMaster) {
    throw new NotFoundError('Land Port not found');
  }

  await LandPortMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Land Port deleted successfully',
  });
});

module.exports = {
  getAllLandPortMaster,
  getLandPortMaster,
  createLandPortMaster,
  updateLandPortMaster,
  deleteLandPortMaster,
};
