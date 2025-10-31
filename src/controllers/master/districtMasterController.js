const { asyncHandler } = require('../../middleware');
const DistrictMaster = require('../../models/master/DistrictMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllDistrictMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const districtMasters = await DistrictMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Districts retrieved successfully',
    data: districtMasters,
  });
});

const getDistrictMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const districtMaster = await DistrictMaster.findById(id);

  if (!districtMaster) {
    throw new NotFoundError('District not found');
  }

  res.status(200).json({
    success: true,
    message: 'District retrieved successfully',
    data: districtMaster,
  });
});

const createDistrictMaster = asyncHandler(async (req, res) => {
  const { districtCode, districtName, status, remarks, organization, company } =
    req.body;

  if (!districtName || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const districtMaster = await DistrictMaster.create({
    districtCode,
    districtName,
    status,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'District created successfully',
    data: districtMaster,
  });
});

const updateDistrictMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const districtMaster = await DistrictMaster.findById(id);

  if (!districtMaster) {
    throw new NotFoundError('District not found');
  }

  const updatedDistrictMaster = await DistrictMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'District updated successfully',
    data: updatedDistrictMaster,
  });
});

const deleteDistrictMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const districtMaster = await DistrictMaster.findById(id);

  if (!districtMaster) {
    throw new NotFoundError('District not found');
  }

  await DistrictMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'District deleted successfully',
  });
});

module.exports = {
  getAllDistrictMaster,
  getDistrictMaster,
  createDistrictMaster,
  updateDistrictMaster,
  deleteDistrictMaster,
};
