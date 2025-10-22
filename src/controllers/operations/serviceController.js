const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Service = require('../../models/operations/Service');
// const { createActivityLog } = require("../../utilities/logUtils");

const createService = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    code,
    workFlows,
    media,
    category,
    costPrice,
    tags,
    sku,
    unit,
    quantity = 1,
    thumbnail = '',
    salesAccount = null,
    purchaseAccount = null,
    organization = null,
    company = null,
  } = req.body;
  const salesaccount = salesAccount === '' ? null : salesAccount;
  const purchaseaccount = purchaseAccount === '' ? null : purchaseAccount;
  const service = new Service({
    name,
    description,
    price,
    code,
    workFlows,
    media,
    category,
    costPrice,
    tags,
    sku,
    unit,
    quantity,
    thumbnail,
    salesAccount: salesaccount,
    purchaseAccount: purchaseaccount,
    organization,
    company,
  });
  await service.save();

  res.status(201).json({
    success: true,
    message: 'Service created successfully',
    data: service,
  });
});

const getAllServices = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const services = await Service.find({
    organization: orgid,
  });
  res.status(200).json({
    success: true,
    message: 'Services fetched successfully',
    data: services,
  });
});

const getService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await Service.findById(id);

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  res.status(200).json({
    success: true,
    message: 'Service retrieved successfully',
    data: service,
  });
});

const updateService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    code,
    workFlows,
    media,
    category,
    costPrice,
    tags,
    sku,
    unit,
    quantity = 1,
    thumbnail = '',
    salesAccount = null,
    purchaseAccount = null,
    organization = null,
    company = null,
  } = req.body;
  const salesaccount = salesAccount === '' ? null : salesAccount;
  const purchaseaccount = purchaseAccount === '' ? null : purchaseAccount;
  const service = await Service.findByIdAndUpdate(
    id,
    {
      name,
      description,
      price,
      code,
      workFlows,
      media,
      category,
      costPrice,
      tags,
      sku,
      unit,
      quantity,
      thumbnail,
      salesAccount: salesaccount,
      purchaseAccount: purchaseaccount,
      organization,
      company,
    },
    { new: true }
  );

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  res.status(200).json({
    success: true,
    message: 'Service updated successfully',
    data: service,
  });
});

const deleteService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const service = await Service.findByIdAndUpdate(
    id,
    {
      isDeleted: true,
    },
    { new: true }
  );

  if (!service) {
    throw new NotFoundError('Service not found');
  }

  res.status(200).json({
    success: true,
    message: 'Service deleted successfully',
    data: service,
  });
});

module.exports = {
  createService,
  getAllServices,
  updateService,
  deleteService,
  getService,
};
