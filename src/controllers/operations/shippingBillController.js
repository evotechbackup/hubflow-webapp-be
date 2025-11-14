const ShippingBill = require('../../models/operations/ShippingBill');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
const Jobs = require('../../models/operations/Jobs');

const createShippingBill = asyncHandler(async (req, res) => {
  const data = req.body;

  const shippingBill = new ShippingBill({
    ...data,
    user: req.id,
  });

  await shippingBill.save();

  res.status(201).json({
    success: true,
    message: 'New Shipping Bill Created',
    data: shippingBill,
  });
});

const getShippingBillsByShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shippingBills = await ShippingBill.find({
    shipmentId: id,
    valid: true,
  });

  res.status(200).json({
    success: true,
    message: 'Shipping Bills Fetched Successfully',
    data: shippingBills,
  });
});

const updateShippingBill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  const shippingBill = await ShippingBill.findByIdAndUpdate(id, data, {
    new: true,
  });

  if (!shippingBill) {
    throw new NotFoundError(shippingBill);
  }

  res.status(200).json({
    success: true,
    message: 'Shipping Bill updated',
    data: shippingBill,
  });
});

const deleteShippingBill = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shippingBill = await ShippingBill.findByIdAndUpdate(
    id,
    {
      $set: {
        valid: false,
      },
    },
    { new: true }
  );

  if (!shippingBill) {
    throw new NotFoundError(shippingBill);
  }

  res.status(200).json({
    success: true,
    message: 'Shipping Bill deleted',
    data: shippingBill,
  });
});

const getShippingBillsByJob = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Jobs.findById(id).select('shipments');

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  const result = await ShippingBill.aggregate([
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
        shippingBills: { $push: '$$ROOT' },
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
    message: 'Shipping Bills Fetched Successfully',
    data: result,
  });
});

module.exports = {
  createShippingBill,
  updateShippingBill,
  getShippingBillsByShipment,
  deleteShippingBill,
  getShippingBillsByJob,
};
