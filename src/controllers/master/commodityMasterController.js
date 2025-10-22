const { asyncHandler } = require('../../middleware');
const CommodityMaster = require('../../models/master/CommodityMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllCommodityMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const commodityMasters = await CommodityMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Commodities retrieved successfully',
    data: commodityMasters,
  });
});

const getCommodityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const commodityMaster = await CommodityMaster.findById(id);

  if (!commodityMaster) {
    throw new NotFoundError('Commodity not found');
  }

  res.status(200).json({
    success: true,
    message: 'Commodity retrieved successfully',
    data: commodityMaster,
  });
});

const createCommodityMaster = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    status,
    type,
    hazardous,
    perishable,
    flammable,
    timber,
    reeferMinTemperature,
    maximumTemperature,
    containerVentilation,
    nmfcClass,
    remarks,
    organization,
    company,
  } = req.body;

  if (!name || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const commodityMaster = await CommodityMaster.create({
    code,
    name,
    status,
    type,
    hazardous,
    perishable,
    flammable,
    timber,
    reeferMinTemperature,
    maximumTemperature,
    containerVentilation,
    nmfcClass,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Commodity created successfully',
    data: commodityMaster,
  });
});

const updateCommodityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const commodityMaster = await CommodityMaster.findById(id);

  if (!commodityMaster) {
    throw new NotFoundError('Commodity not found');
  }

  const updatedCommodity = await CommodityMaster.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Commodity updated successfully',
    data: updatedCommodity,
  });
});

const deleteCommodityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const commodityMaster = await CommodityMaster.findById(id);

  if (!commodityMaster) {
    throw new NotFoundError('Commodity not found');
  }

  await CommodityMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Commodity deleted successfully',
  });
});

module.exports = {
  getAllCommodityMaster,
  getCommodityMaster,
  createCommodityMaster,
  updateCommodityMaster,
  deleteCommodityMaster,
};
