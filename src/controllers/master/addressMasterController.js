const { asyncHandler } = require('../../middleware');
const AddressMaster = require('../../models/master/AddressMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllAddressMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const addressMasters = await AddressMaster.find({
    organization: orgid,
  })
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName')
    .populate('city', 'cityName');

  res.status(200).json({
    success: true,
    message: 'Address retrieved successfully',
    data: addressMasters,
  });
});

const getAddressMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const addressMaster = await AddressMaster.findById(id)
    .populate('country', 'name')
    .populate('region', 'regionName')
    .populate('zone', 'zoneName')
    .populate('city', 'cityName');

  if (!addressMaster) {
    throw new NotFoundError('Address not found');
  }

  res.status(200).json({
    success: true,
    message: 'Address retrieved successfully',
    data: addressMaster,
  });
});

const createAddressMaster = asyncHandler(async (req, res) => {
  const {
    addressCode,
    addressLine1,
    addressLine2,
    country,
    region,
    zone,
    city,
    status,
    organization,
    company,
  } = req.body;

  const countryId = country === '' ? null : country;
  const regionId = region === '' ? null : region;
  const zoneId = zone === '' ? null : zone;
  const cityId = city === '' ? null : city;

  if (!addressLine1 || !organization) {
    throw new ValidationError('Address line 1 and organization are required');
  }

  const addressMaster = await AddressMaster.create({
    addressCode,
    addressLine1,
    addressLine2,
    country: countryId,
    region: regionId,
    zone: zoneId,
    city: cityId,
    status,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Address created successfully',
    data: addressMaster,
  });
});

const updateAddressMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const addressMaster = await AddressMaster.findById(id);

  if (!addressMaster) {
    throw new NotFoundError('Address not found');
  }

  const updatedAddressMaster = await AddressMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Address updated successfully',
    data: updatedAddressMaster,
  });
});

const deleteAddressMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const addressMaster = await AddressMaster.findById(id);

  if (!addressMaster) {
    throw new NotFoundError('Address not found');
  }

  await AddressMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Address deleted successfully',
  });
});

module.exports = {
  getAllAddressMaster,
  getAddressMaster,
  createAddressMaster,
  updateAddressMaster,
  deleteAddressMaster,
};
