const { asyncHandler } = require('../../middleware');
const VesselMaster = require('../../models/master/VesselMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllVesselMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const vesselMasters = await VesselMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Vessels retrieved successfully',
    data: vesselMasters,
  });
});

const getVesselMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vesselMaster = await VesselMaster.findById(id);

  if (!vesselMaster) {
    throw new NotFoundError('Vessel not found');
  }

  res.status(200).json({
    success: true,
    message: 'Vessel retrieved successfully',
    data: vesselMaster,
  });
});

const createVesselMaster = asyncHandler(async (req, res) => {
  const {
    code,
    name,
    vesselId,
    type,
    builtOnYear,
    imoNumber,
    size,
    draught,
    draughtWeight,
    grossTonnage,
    netTonnage,
    owner,
    manager,
    placeOfBuild,
    builder,
    callsign,
    remarks,
    organization,
    company,
  } = req.body;

  if (!name || !organization) {
    throw new ValidationError('Name and organization are required');
  }

  const vesselMaster = await VesselMaster.create({
    code,
    name,
    vesselId,
    type,
    builtOnYear,
    imoNumber,
    size,
    draught,
    draughtWeight,
    grossTonnage,
    netTonnage,
    owner,
    manager,
    placeOfBuild,
    builder,
    callsign,
    remarks,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Vessel created successfully',
    data: vesselMaster,
  });
});

const updateVesselMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const vesselMaster = await VesselMaster.findById(id);

  if (!vesselMaster) {
    throw new NotFoundError('Vessel not found');
  }

  const updatedVesselMaster = await VesselMaster.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    message: 'Vessel updated successfully',
    data: updatedVesselMaster,
  });
});

const deleteVesselMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const vesselMaster = await VesselMaster.findById(id);

  if (!vesselMaster) {
    throw new NotFoundError('Vessel not found');
  }

  await VesselMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Vessel deleted successfully',
  });
});

module.exports = {
  getAllVesselMaster,
  getVesselMaster,
  createVesselMaster,
  updateVesselMaster,
  deleteVesselMaster,
};
