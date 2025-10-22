const { asyncHandler } = require('../../middleware');
const ClauseMaster = require('../../models/master/ClauseMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllClauseMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const clauseMasters = await ClauseMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Clauses retrieved successfully',
    data: clauseMasters,
  });
});

const getClauseMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const clauseMaster = await ClauseMaster.findById(id);

  if (!clauseMaster) {
    throw new NotFoundError('Clause not found');
  }

  res.status(200).json({
    success: true,
    message: 'Clause retrieved successfully',
    data: clauseMaster,
  });
});

const createClauseMaster = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    status,
    description,
    carrier,
    clauseType,
    stampIdentifier,
    remarks,
    organization,
    company,
  } = req.body;

  if (!name || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const clauseMaster = await ClauseMaster.create({
    code,
    name,
    status,
    description,
    carrier,
    clauseType,
    stampIdentifier,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Clause created successfully',
    data: clauseMaster,
  });
});

const updateClauseMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const clauseMaster = await ClauseMaster.findById(id);

  if (!clauseMaster) {
    throw new NotFoundError('Clause not found');
  }

  const updatedClauseMaster = await ClauseMaster.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Clause updated successfully',
    data: updatedClauseMaster,
  });
});

const deleteClauseMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const clauseMaster = await ClauseMaster.findById(id);

  if (!clauseMaster) {
    throw new NotFoundError('Clause not found');
  }

  await ClauseMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Clause deleted successfully',
  });
});

module.exports = {
  getAllClauseMaster,
  getClauseMaster,
  createClauseMaster,
  updateClauseMaster,
  deleteClauseMaster,
};
