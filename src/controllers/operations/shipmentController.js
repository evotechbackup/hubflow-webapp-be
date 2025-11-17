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

const updateShipment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const shipmentData = req.body;

  const { items = [], ...rest } = shipmentData;

  const shipment = await Shipment.findById(id);

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  Object.assign(shipment, rest);

  const invoicedItems = shipment.items.filter(
    (item) => item?.invoiceRef || item?.purchaseRef || item?.purchaseInvoiceRef
  );

  shipment.items = [...invoicedItems, ...items];

  await shipment.save();

  res.status(200).json({
    success: true,
    message: 'Shipment updated successfully',
    data: shipment,
  });
});

const addActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const activityData = req.body;

  const shipment = await Shipment.findByIdAndUpdate(
    id,
    { $push: { items: { $each: activityData } } },
    { new: true }
  );

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  res.status(200).json({
    success: true,
    message: 'Activity added successfully',
    data: shipment,
  });
});

const getShipmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shipment = await Shipment.findById(id)
    .populate('organization', ['organizationLogo'])
    .populate('booking', ['id'])
    .populate('user', ['fullName'])
    .populate('items.vendor', ['displayName', 'emailAddress', 'billingAddress'])
    .populate({
      path: 'jobId',
      select: 'customer shipmentType id',
      populate: {
        path: 'customer',
        select: 'displayName billingAddress',
      },
    });

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  res.status(200).json({
    success: true,
    message: 'Shipment fetched successfully',
    data: shipment,
  });
});

const updateExchangeRate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    fromCurrency,
    fromCurrencyCode,
    toCurrency,
    toCurrencyCode,
    exchangeRate,
  } = req.body;

  const shipment = await Shipment.findByIdAndUpdate(
    id,
    {
      $set: {
        fromCurrency,
        fromCurrencyCode,
        toCurrency,
        toCurrencyCode,
        exchangeRate,
      },
    },
    { new: true }
  );

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  res.status(200).json({
    success: true,
    message: 'Exchange rate updated successfully',
    data: shipment,
  });
});

module.exports = {
  createShipment,
  updateShipment,
  addActivity,
  getShipmentById,
  updateExchangeRate,
};
