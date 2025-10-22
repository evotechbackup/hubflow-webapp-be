const { asyncHandler } = require('../../middleware');
const ContainerTypeMaster = require('../../models/master/ContainerTypeMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllContainerTypeMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const containerTypeMasters = await ContainerTypeMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Container Types retrieved successfully',
    data: containerTypeMasters,
  });
});

const getContainerTypeMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const containerTypeMaster = await ContainerTypeMaster.findById(id);

  if (!containerTypeMaster) {
    throw new NotFoundError('Container Type not found');
  }

  res.status(200).json({
    success: true,
    message: 'Container Type retrieved successfully',
    data: containerTypeMaster,
  });
});

const createContainerTypeMaster = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    typecode,
    status,
    size,
    interiorWidthInMeter,
    interiorHeightInMeter,
    interiorLengthInMeter,
    noOfTeu,
    isHighCube,
    volumnInCBM,
    isoCode,
    grossWeightInKg,
    grossWeightInLb,
    tareWeightInKg,
    tareWeightInLb,
    payloadWeightInKg,
    payloadWeightInLb,

    remarks,
    organization,
    company,
  } = req.body;

  if (!name || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const containerTypeMaster = await ContainerTypeMaster.create({
    code,
    name,
    typecode,
    status,
    size,
    interiorWidthInMeter,
    interiorHeightInMeter,
    interiorLengthInMeter,
    noOfTeu,
    isHighCube,
    volumnInCBM,
    isoCode,
    grossWeightInKg,
    grossWeightInLb,
    tareWeightInKg,
    tareWeightInLb,
    payloadWeightInKg,
    payloadWeightInLb,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Container Type created successfully',
    data: containerTypeMaster,
  });
});

const updateContainerTypeMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const containerTypeMaster = await ContainerTypeMaster.findById(id);

  if (!containerTypeMaster) {
    throw new NotFoundError('Container Type not found');
  }

  const updatedContainerTypeMaster =
    await ContainerTypeMaster.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

  res.status(200).json({
    success: true,
    message: 'Container Type updated successfully',
    data: updatedContainerTypeMaster,
  });
});

const deleteContainerTypeMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const containerTypeMaster = await ContainerTypeMaster.findById(id);

  if (!containerTypeMaster) {
    throw new NotFoundError('Container Type not found');
  }

  await ContainerTypeMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Container Type deleted successfully',
  });
});

module.exports = {
  getAllContainerTypeMaster,
  getContainerTypeMaster,
  createContainerTypeMaster,
  updateContainerTypeMaster,
  deleteContainerTypeMaster,
};
