const { asyncHandler } = require('../../middleware');
const ContainerInventoryMaster = require('../../models/master/ContainerInventoryMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllContainerInventoryMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const containerInventoryMasters = await ContainerInventoryMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Container Inventory retrieved successfully',
    data: containerInventoryMasters,
  });
});

const getContainerInventoryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const containerInventoryMaster = await ContainerInventoryMaster.findById(id);

  if (!containerInventoryMaster) {
    throw new NotFoundError('Container Inventory not found');
  }

  res.status(200).json({
    success: true,
    message: 'Container Inventory retrieved successfully',
    data: containerInventoryMaster,
  });
});

const createContainerInventoryMaster = asyncHandler(async (req, res) => {
  const {
    status,
    containerNo,
    containerType,
    containerStatus,
    leaseOwnType,
    purchaseDate,
    onHireDate,
    onHireLocation,
    OffHireDate,
    offHireLocation,
    leaseAmount,
    currency,
    stickerCompleted,
    remarks,
    organization,
    company,
  } = req.body;

  if (!containerNo || !organization) {
    throw new ValidationError('Container No and Organization are required');
  }

  const containerInventoryMaster = await ContainerInventoryMaster.create({
    status,
    containerNo,
    containerType,
    containerStatus,
    leaseOwnType,
    purchaseDate,
    onHireDate,
    onHireLocation,
    OffHireDate,
    offHireLocation,
    leaseAmount,
    currency,
    stickerCompleted,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Container Inventory created successfully',
    data: containerInventoryMaster,
  });
});

const updateContainerInventoryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const containerInventoryMaster = await ContainerInventoryMaster.findById(id);

  if (!containerInventoryMaster) {
    throw new NotFoundError('Container Inventory not found');
  }

  const updatedContainerInventoryMaster =
    await ContainerInventoryMaster.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

  res.status(200).json({
    success: true,
    message: 'Container Inventory updated successfully',
    data: updatedContainerInventoryMaster,
  });
});

const deleteContainerInventoryMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const containerInventoryMaster = await ContainerInventoryMaster.findById(id);

  if (!containerInventoryMaster) {
    throw new NotFoundError('Container Inventory not found');
  }

  await ContainerInventoryMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Container Inventory deleted successfully',
  });
});

module.exports = {
  getAllContainerInventoryMaster,
  getContainerInventoryMaster,
  createContainerInventoryMaster,
  updateContainerInventoryMaster,
  deleteContainerInventoryMaster,
};
