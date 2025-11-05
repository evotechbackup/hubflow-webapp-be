const CRMItems = require('../../models/crm/CRMItems');
const { asyncHandler } = require('../../middleware/errorHandler');

// const { createActivityLog } = require("../../utilities/logUtils");

const createItem = asyncHandler(async (req, res) => {
  const {
    sku,
    productName,
    description,
    tags,
    price,
    costPrice,
    inWarehouseQuantity,
    thumbnail,
    mediaName,
    weight,
    width,
    height,
    length,
    organization,
    company,
    manufacturer,
    brand,
    upc,
    ean,
    mpn,
    isbn,
    unit,
    status,
    files,
    code,
    serialNumber,
  } = req.body;

  const newCRMItems = new CRMItems({
    sku,
    productName,
    description,
    tags,
    price,
    costPrice,
    inWarehouseQuantity,
    thumbnail,
    mediaName,
    weight,
    width,
    height,
    length,
    organization,
    company,
    manufacturer,
    brand,
    upc,
    ean,
    mpn,
    isbn,
    unit,
    status,
    files,
    code,
    serialNumber,
  });

  const savedItem = await newCRMItems.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   actionId: savedItem.productName,
  //   type: 'crmitems',
  //   organization: savedItem.organization,
  //   company: savedItem.company,
  // });

  res.status(201).json({
    success: true,
    message: 'create item successfully',
    data: savedItem,
  });
});

// Get all CRM items
const getAllItems = asyncHandler(async (req, res) => {
  const items = await CRMItems.find().select(
    'productName price inWarehouseQuantity sku tags thumbnail'
  );

  res.status(200).json({
    success: true,
    message: 'fetch item successfully',
    data: items,
  });
});

// Get CRM item by ID
const getItemById = asyncHandler(async (req, res) => {
  const item = await CRMItems.findById(req.params.id);
  if (!item) {
    throw new Error('CRM Item not found');
  }

  res.status(200).json({
    success: true,
    message: 'fetch item successfully',
    data: item,
  });
});

// Update CRM item
const updateItem = asyncHandler(async (req, res) => {
  const updatedItem = await CRMItems.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true }
  );

  if (!updatedItem) {
    throw new Error('CRM Item not found');
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   actionId: updatedItem.productName,
  //   type: 'crmitems',
  //   organization: updatedItem.organization,
  //   company: updatedItem.company,
  // });

  res.status(200).json({
    success: true,
    message: 'update item successfully',
    data: updatedItem,
  });
});

module.exports = {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
};
