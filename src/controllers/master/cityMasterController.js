const { asyncHandler } = require('../../middleware');
const CityMaster = require('../../models/master/CityMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllCityMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const cityMasters = await CityMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Cities retrieved successfully',
    data: cityMasters,
  });
});

const getCityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cityMaster = await CityMaster.findById(id);

  if (!cityMaster) {
    throw new NotFoundError('City not found');
  }

  res.status(200).json({
    success: true,
    message: 'City retrieved successfully',
    data: cityMaster,
  });
});

const createCityMaster = asyncHandler(async (req, res) => {
  const { cityCode, cityName, status, remarks, organization, company } =
    req.body;

  if (!cityName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const cityMaster = await CityMaster.create({
    cityCode,
    cityName,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'City created successfully',
    data: cityMaster,
  });
});

const updateCityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const cityMaster = await CityMaster.findById(id);

  if (!cityMaster) {
    throw new NotFoundError('City not found');
  }

  const updatedCityMaster = await CityMaster.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'City updated successfully',
    data: updatedCityMaster,
  });
});

const deleteCityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const cityMaster = await CityMaster.findById(id);

  if (!cityMaster) {
    throw new NotFoundError('City not found');
  }

  await CityMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'City deleted successfully',
  });
});

module.exports = {
  getAllCityMaster,
  getCityMaster,
  createCityMaster,
  updateCityMaster,
  deleteCityMaster,
};
