const { asyncHandler } = require('../../middleware/errorHandler');
const Jobs = require('../../models/operations/Jobs');
const Shipment = require('../../models/operations/Shipment');
const Booking = require('../../models/sales/Booking');
const { NotFoundError } = require('../../utils/errors');

const createShipment = asyncHandler(async (req, res) => {
  const shipmentData = req.body;

  const shipment = new Shipment({
    ...shipmentData,
    user: req.id,
  });

  await shipment.save();

  await Jobs.findByIdAndUpdate(shipment.jobId, {
    $push: { shipments: shipment._id },
  });

  await Booking.findByIdAndUpdate(shipment.booking, { jobCreated: true });

  res.status(201).json({
    success: true,
    message: 'Shipment created successfully',
    data: shipment,
  });
});

const getShipmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shipment = await Shipment.findById(id);

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  res.status(200).json({
    success: true,
    message: 'Shipment fetched successfully',
    data: shipment,
  });
});

module.exports = {
  createShipment,
  getShipmentById,
};
