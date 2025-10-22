const { asyncHandler } = require('../../middleware');
const CountryMaster = require('../../models/master/CountryMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllCountryMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const countryMasters = await CountryMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Countries retrieved successfully',
    data: countryMasters,
  });
});

const getCountryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const countryMaster = await CountryMaster.findById(id);

  if (!countryMaster) {
    throw new NotFoundError('Country not found');
  }

  res.status(200).json({
    success: true,
    message: 'Country retrieved successfully',
    data: countryMaster,
  });
});

const createCountryMaster = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    shortName,
    status,
    region,
    awbCurrency,
    localCurrency,
    dialingCode,
    isoAlpha3Code,
    isoUNM49Code,
    remarks,
    organization,
    company,
  } = req.body;

  if (!name || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const countryMaster = await CountryMaster.create({
    code,
    name,
    shortName,
    status,
    region,
    awbCurrency,
    localCurrency,
    dialingCode,
    isoAlpha3Code,
    isoUNM49Code,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Country created successfully',
    data: countryMaster,
  });
});

const updateCountryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const countryMaster = await CountryMaster.findById(id);

  if (!countryMaster) {
    throw new NotFoundError('Country not found');
  }

  const updatedCountryMaster = await CountryMaster.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Country updated successfully',
    data: updatedCountryMaster,
  });
});

const deleteCountryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const countryMaster = await CountryMaster.findById(id);

  if (!countryMaster) {
    throw new NotFoundError('Country not found');
  }

  await CountryMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Country deleted successfully',
  });
});

module.exports = {
  getAllCountryMaster,
  getCountryMaster,
  createCountryMaster,
  updateCountryMaster,
  deleteCountryMaster,
};
