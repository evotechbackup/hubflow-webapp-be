const { asyncHandler } = require('../../middleware');
const NationalityMaster = require('../../models/master/NationalityMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllNationalityMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const nationalityMasters = await NationalityMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Nationalities retrieved successfully',
    data: nationalityMasters,
  });
});

const getNationalityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const nationalityMaster = await NationalityMaster.findById(id);

  if (!nationalityMaster) {
    throw new NotFoundError('Nationality not found');
  }

  res.status(200).json({
    success: true,
    message: 'Nationality retrieved successfully',
    data: nationalityMaster,
  });
});

const createNationalityMaster = asyncHandler(async (req, res) => {
  const {
    nationalityCode,
    nationalityName,
    status,
    remarks,
    organization,
    company,
  } = req.body;

  if (!nationalityName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const nationalityMaster = await NationalityMaster.create({
    nationalityCode,
    nationalityName,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Nationality created successfully',
    data: nationalityMaster,
  });
});

const updateNationalityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const nationalityMaster = await NationalityMaster.findById(id);

  if (!nationalityMaster) {
    throw new NotFoundError('Nationality not found');
  }

  const updatedNationalityMaster = await NationalityMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Nationality updated successfully',
    data: updatedNationalityMaster,
  });
});

const deleteNationalityMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const nationalityMaster = await NationalityMaster.findById(id);

  if (!nationalityMaster) {
    throw new NotFoundError('Nationality not found');
  }

  await NationalityMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Nationality deleted successfully',
  });
});

module.exports = {
  getAllNationalityMaster,
  getNationalityMaster,
  createNationalityMaster,
  updateNationalityMaster,
  deleteNationalityMaster,
};
