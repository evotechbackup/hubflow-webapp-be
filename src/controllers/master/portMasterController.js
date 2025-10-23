const { asyncHandler } = require('../../middleware');
const PortMaster = require('../../models/master/PortMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllPortMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const portMasters = await PortMaster.find({
    organization: orgid,
  })
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName');

  res.status(200).json({
    success: true,
    message: 'Port retrieved successfully',
    data: portMasters,
  });
});

const getPortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const portMaster = await PortMaster.findById(id)
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName');

  if (!portMaster) {
    throw new NotFoundError('Port not found');
  }

  res.status(200).json({
    success: true,
    message: 'Port retrieved successfully',
    data: portMaster,
  });
});

const createPortMaster = asyncHandler(async (req, res) => {
  const {
    portCode,
    portName,
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

  if (!portName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const portMaster = await PortMaster.create({
    portCode,
    portName,
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
    message: 'Port created successfully',
    data: portMaster,
  });
});

const updatePortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const portMaster = await PortMaster.findById(id);

  if (!portMaster) {
    throw new NotFoundError('Port not found');
  }

  const updatedPortMaster = await PortMaster.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Port updated successfully',
    data: updatedPortMaster,
  });
});

const deletePortMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const portMaster = await PortMaster.findById(id);

  if (!portMaster) {
    throw new NotFoundError('Port not found');
  }

  await PortMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Port deleted successfully',
  });
});

module.exports = {
  getAllPortMaster,
  getPortMaster,
  createPortMaster,
  updatePortMaster,
  deletePortMaster,
};
