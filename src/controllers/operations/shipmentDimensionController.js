const ShipmentDimension = require('../../models/operations/ShipmentDimension');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Jobs = require('../../models/operations/Jobs');

const createDimension = asyncHandler(async (req, res) => {
  const dimensionData = req.body;

  const dimension = new ShipmentDimension({
    ...dimensionData,
    user: req.id,
  });

  await dimension.save();

  res.status(201).json({
    success: true,
    message: 'New Dimension Created',
    data: dimension,
  });
});

const getDimensionsByShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dimensions = await ShipmentDimension.find({
    shipmentId: id,
    valid: true,
  });

  res.status(200).json({
    success: true,
    message: 'Dimensions Fetched Successfully',
    data: dimensions,
  });
});

const updateDimension = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const dimensionData = req.body;

  const dimension = await ShipmentDimension.findByIdAndUpdate(
    id,
    dimensionData,
    { new: true }
  );

  if (!dimension) {
    throw new NotFoundError(dimension);
  }

  res.status(200).json({
    success: true,
    message: 'Dimension updated',
    data: dimension,
  });
});

const deleteDimension = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const dimension = await ShipmentDimension.findByIdAndUpdate(
    id,
    {
      $set: {
        valid: false,
      },
    },
    { new: true }
  );

  if (!dimension) {
    throw new NotFoundError(dimension);
  }

  res.status(200).json({
    success: true,
    message: 'Dimension deleted',
    data: dimension,
  });
});

const getDimensionsByJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Jobs.findById(id).select('shipments');

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const result = await ShipmentDimension.aggregate([
    {
      $match: {
        shipmentId: {
          $in: job.shipments,
        },
      },
    },
    {
      $group: {
        _id: '$shipmentId',
        dimensions: { $push: '$$ROOT' },
      },
    },
    {
      $lookup: {
        from: 'shipments',
        localField: '_id',
        foreignField: '_id',
        as: 'shipment',
        pipeline: [
          {
            $project: {
              id: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        dimensions: 1,
        shipment: {
          $arrayElemAt: ['$shipment', 0],
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Dimensions Fetched Successfully',
    data: result,
  });
});

module.exports = {
  createDimension,
  getDimensionsByShipment,
  updateDimension,
  deleteDimension,
  getDimensionsByJob,
};
