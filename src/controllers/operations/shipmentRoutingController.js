const ShipmentRouting = require('../../models/operations/ShipmentRouting');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Jobs = require('../../models/operations/Jobs');

const createRouting = asyncHandler(async (req, res) => {
  const routingData = req.body;

  const routing = new ShipmentRouting({
    ...routingData,
    user: req.id,
  });

  await routing.save();

  res.status(201).json({
    success: true,
    message: 'New Routing Created',
    data: routing,
  });
});

const getRoutingsByShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const routings = await ShipmentRouting.find({
    shipmentId: id,
    valid: true,
  });

  res.status(200).json({
    success: true,
    message: 'Routings Fetched Successfully',
    data: routings,
  });
});

const updateRouting = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const routingData = req.body;

  const routing = await ShipmentRouting.findByIdAndUpdate(id, routingData, {
    new: true,
  });

  if (!routing) {
    throw new NotFoundError(routing);
  }

  res.status(200).json({
    success: true,
    message: 'Routing updated',
    data: routing,
  });
});

const deleteRouting = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const routing = await ShipmentRouting.findByIdAndUpdate(
    id,
    {
      $set: {
        valid: false,
      },
    },
    { new: true }
  );

  if (!routing) {
    throw new NotFoundError(routing);
  }

  res.status(200).json({
    success: true,
    message: 'Routing deleted',
    data: routing,
  });
});

const getRoutingsByJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Jobs.findById(id).select('shipments');

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const result = await ShipmentRouting.aggregate([
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
        routings: { $push: '$$ROOT' },
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
        routings: 1,
        shipment: {
          $arrayElemAt: ['$shipment', 0],
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Routings Fetched Successfully',
    data: result,
  });
});

module.exports = {
  createRouting,
  updateRouting,
  getRoutingsByShipment,
  deleteRouting,
  getRoutingsByJob,
};
