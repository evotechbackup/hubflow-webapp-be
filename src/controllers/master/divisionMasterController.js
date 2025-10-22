const { asyncHandler } = require('../../middleware');
const DivisionMaster = require('../../models/master/DivisionMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllDivisionMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const divisionMasters = await DivisionMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Divisions retrieved successfully',
    data: divisionMasters,
  });
});

const getDivisionMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const divisionMaster = await DivisionMaster.findById(id);

  if (!divisionMaster) {
    throw new NotFoundError('Division not found');
  }

  res.status(200).json({
    success: true,
    message: 'Division retrieved successfully',
    data: divisionMaster,
  });
});

const createDivisionMaster = asyncHandler(async (req, res) => {
  const { divisionCode, divisionName, status, remarks, organization, company } =
    req.body;

  if (!divisionName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const divisionMaster = await DivisionMaster.create({
    divisionCode,
    divisionName,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Division created successfully',
    data: divisionMaster,
  });
});

const updateDivisionMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const divisionMaster = await DivisionMaster.findById(id);

  if (!divisionMaster) {
    throw new NotFoundError('Division not found');
  }

  const updatedDivisionMaster = await DivisionMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Division updated successfully',
    data: updatedDivisionMaster,
  });
});

const deleteDivisionMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const divisionMaster = await DivisionMaster.findById(id);

  if (!divisionMaster) {
    throw new NotFoundError('Division not found');
  }

  await DivisionMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Division deleted successfully',
  });
});

module.exports = {
  getAllDivisionMaster,
  getDivisionMaster,
  createDivisionMaster,
  updateDivisionMaster,
  deleteDivisionMaster,
};
