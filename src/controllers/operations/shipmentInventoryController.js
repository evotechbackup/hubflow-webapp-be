const ShipmentInventory = require('../../models/operations/ShipmentInventory');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Jobs = require('../../models/operations/Jobs');

const createInventory = asyncHandler(async (req, res) => {
  const inventoryData = req.body;

  const inventory = new ShipmentInventory({
    ...inventoryData,
    user: req.id,
  });

  await inventory.save();

  res.status(201).json({
    success: true,
    message: 'New Inventory Created',
    data: inventory,
  });
});

const getInventoryByShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const inventory = await ShipmentInventory.find({
    shipmentId: id,
    valid: true,
  });

  res.status(200).json({
    success: true,
    message: 'Inventory Fetched Successfully',
    data: inventory,
  });
});

const updateInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventoryData = req.body;

  const inventory = await ShipmentInventory.findByIdAndUpdate(
    id,
    inventoryData,
    { new: true }
  );

  if (!inventory) {
    throw new NotFoundError(inventory);
  }

  res.status(200).json({
    success: true,
    message: 'Inventory updated',
    data: inventory,
  });
});

const deleteInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const inventory = await ShipmentInventory.findByIdAndUpdate(
    id,
    {
      $set: {
        valid: false,
      },
    },
    { new: true }
  );

  if (!inventory) {
    throw new NotFoundError(inventory);
  }

  res.status(200).json({
    success: true,
    message: 'Inventory deleted',
    data: inventory,
  });
});

const getInventoryByJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Jobs.findById(id).select('shipments');

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const result = await ShipmentInventory.aggregate([
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
        inventory: { $push: '$$ROOT' },
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
        inventory: 1,
        shipment: {
          $arrayElemAt: ['$shipment', 0],
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Inventory Fetched Successfully',
    data: result,
  });
});

module.exports = {
  createInventory,
  getInventoryByShipment,
  updateInventory,
  deleteInventory,
  getInventoryByJob,
};
