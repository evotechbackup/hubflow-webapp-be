const { asyncHandler } = require('../../middleware');
const CurrencyMaster = require('../../models/master/CurrencyMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllCurrencyMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const currencyMasters = await CurrencyMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Currencies retrieved successfully',
    data: currencyMasters,
  });
});

const getCurrencyMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const currencyMaster = await CurrencyMaster.findById(id);

  if (!currencyMaster) {
    throw new NotFoundError('Currency not found');
  }

  res.status(200).json({
    success: true,
    message: 'Currency retrieved successfully',
    data: currencyMaster,
  });
});

const createCurrencyMaster = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    status,
    decimalPlaces,
    numberToBasic,
    shortName,
    symbol,
    prefix,
    suffix,
    icon,
    ediCode,
    languagePrefix,
    languageSuffix,
    languagePrefixAddon,
    languageSuffixAddon,
    remarks,
    organization,
    company,
  } = req.body;

  if (!name || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const currencyMaster = await CurrencyMaster.create({
    code,
    name,
    status,
    decimalPlaces,
    numberToBasic,
    shortName,
    symbol,
    prefix,
    suffix,
    icon,
    ediCode,
    languagePrefix,
    languageSuffix,
    languagePrefixAddon,
    languageSuffixAddon,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Currency created successfully',
    data: currencyMaster,
  });
});

const updateCurrencyMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const currencyMaster = await CurrencyMaster.findById(id);

  if (!currencyMaster) {
    throw new NotFoundError('Currency not found');
  }

  const updatedCurrency = await CurrencyMaster.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Currency updated successfully',
    data: updatedCurrency,
  });
});

const deleteCurrencyMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const currencyMaster = await CurrencyMaster.findById(id);

  if (!currencyMaster) {
    throw new NotFoundError('Currency not found');
  }

  await CurrencyMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Currency deleted successfully',
  });
});

module.exports = {
  getAllCurrencyMaster,
  getCurrencyMaster,
  createCurrencyMaster,
  updateCurrencyMaster,
  deleteCurrencyMaster,
};
