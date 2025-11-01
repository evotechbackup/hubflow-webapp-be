const InventoryFleet = require('../../models/fleets/InventoryFleet');
// const User = require('../../models/auth/User');
const mongoose = require('mongoose');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
// const { createActivityLog } = require("../../utilities/logUtils");
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const bucketname = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey,
  },
  region: bucketRegion,
});

const createFleet = asyncHandler(async (req, res) => {
  let productData = req.body;
  const {
    salesInfo,
    purchaseInfo,
    inventoryInfo,
    salesAccount,
    purchaseAccount,
    inventoryAccount,
  } = req.body;
  if (salesInfo && salesAccount !== '') {
    productData = { ...productData, salesAccount };
  } else {
    productData = { ...productData, salesAccount: null };
  }
  if (purchaseInfo && purchaseAccount !== '') {
    productData = { ...productData, purchaseAccount };
  } else {
    productData = { ...productData, purchaseAccount: null };
  }
  if (inventoryInfo && inventoryAccount !== '') {
    productData = { ...productData, inventoryAccount };
  } else {
    productData = { ...productData, inventoryAccount: null };
  }
  const createdProduct = await InventoryFleet.create(productData);

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'create',
  //     actionId: createdProduct.productName,
  //     type: 'Fleets',
  //     organization: createdProduct.organization,
  //     company: createdProduct.company,
  //   });

  res.status(201).json({
    success: true,
    message: 'Fleet created successfully',
    data: createdProduct,
  });
});

const uploadFleetFolder = asyncHandler(async (req, res) => {
  const { filename } = req.body;
  const params = {
    Bucket: bucketname,
    Key: filename,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };

  const command = new PutObjectCommand(params);

  await s3.send(command);

  const updateProduct = await InventoryFleet.findByIdAndUpdate(
    req.params.id,
    {
      $push: {
        files: {
          name: req.body.name,
          filename: req.body.filename,
          notify: req.body.notify,
          expiryDate: req.body.expiryDate,
          reminderDate: req.body.reminderDate,
        },
      },
    },
    { new: true }
  );

  //   if (req.body.notify === 'true' && req.body.department !== 'undefined') {
  //     const users = await User.find({
  //       department: req.body.department,
  //       profileType: { $regex: 'admin', $options: 'i' },
  //     });
  //     for (const user of users) {
  //       const notification = new Notification({
  //         agent: user._id,
  //         title: `Document ${req.body.filename} expires`,
  //         body: `Document ${req.body.filename} expires on ${new Date(
  //           req.body.expiryDate
  //         ).toLocaleDateString()}`,
  //         type: 'document',
  //         dueDate: new Date(req.body.expiryDate),
  //         reminderDate: new Date(req.body.reminderDate),
  //       });
  //       await notification.save();
  //     }
  //   }
  res.json({
    success: true,
    message: 'success',
    data: updateProduct,
  });
});

const getfleetbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await InventoryFleet.findById(id)
    .populate('salesAccount')
    .populate('purchaseAccount')
    .populate('inventoryAccount')
    .populate('category', ['name']);
  res.status(200).json({
    success: true,
    message: 'Fleet retrieved successfully',
    data: product,
  });
});

const getFleetsBytype = asyncHandler(async (req, res) => {
  const { orgid, type } = req.params;
  const {
    filter_category,
    filter_tag,
    filter_validity,
    filter_rentType,
    search_query,
  } = req.query;

  const query = {
    organization: orgid,
    isDeleted: false,
  };

  if (
    filter_category &&
    filter_category !== '' &&
    filter_category !== 'undefined' &&
    filter_category !== 'null'
  ) {
    query.category = filter_category;
  } else {
    query.rentalType = type;
  }

  if (
    filter_tag &&
    filter_tag !== '' &&
    filter_tag !== 'undefined' &&
    filter_tag !== 'null'
  ) {
    query.tags = filter_tag;
  }

  if (
    filter_validity &&
    filter_validity !== '' &&
    filter_validity !== 'undefined' &&
    filter_validity !== 'null'
  ) {
    query.isDeleted = filter_validity === 'true';
  }

  if (
    filter_rentType &&
    filter_rentType !== '' &&
    filter_rentType !== 'undefined' &&
    filter_rentType !== 'null'
  ) {
    query.rentType = filter_rentType;
  }

  if (
    search_query &&
    search_query !== '' &&
    search_query !== 'undefined' &&
    search_query !== 'null'
  ) {
    query.productName = { $regex: search_query, $options: 'i' };
  }

  const products = await InventoryFleet.find(query)
    .populate('category', ['name'])
    .select(
      'productName price inWarehouseQuantity category rentalType thumbnail serialNumber sku tags rentType'
    );
  res.status(200).json({
    success: true,
    message: 'Fleets retrieved successfully',
    data: products,
  });
});

const deleteFleet = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const existingProduct = await InventoryFleet.findByIdAndUpdate(productId, {
    isDeleted: true,
  });
  if (!existingProduct) {
    throw new Error('Product not found');
  }

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'delete',
  //     actionId: existingProduct.productName,
  //     type: 'Fleet',
  //     organization: existingProduct.organization,
  //     company: existingProduct.company,
  //   });

  res.status(200).json({
    success: true,
    message: 'Fleet deleted successfully',
  });
});

const updateFleet = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  let productData = req.body;
  const {
    salesInfo,
    purchaseInfo,
    salesAccount,
    purchaseAccount,
    inventoryAccount,
    inventoryInfo,
  } = req.body;
  if (salesInfo && salesAccount !== '') {
    productData = { ...productData, salesAccount };
  } else {
    productData = { ...productData, salesAccount: null };
  }
  if (purchaseInfo && purchaseAccount !== '') {
    productData = { ...productData, purchaseAccount };
  } else {
    productData = { ...productData, purchaseAccount: null };
  }
  if (inventoryInfo && inventoryAccount !== '') {
    productData = { ...productData, inventoryAccount };
  } else {
    productData = { ...productData, inventoryAccount: null };
  }

  // Check if the product exists
  const existingProduct = await InventoryFleet.findById(productId);
  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Update the product
  const updatedProduct = await InventoryFleet.findByIdAndUpdate(
    productId,
    productData,
    { new: true }
  );

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'update',
  //   actionId: updatedProduct.productName,
  //   type: 'Fleet',
  //   organization: updatedProduct.organization,
  //   company: updatedProduct.company,
  // });
  res.status(200).json({
    success: true,
    message: 'Fleet updated successfully',
    data: updatedProduct,
  });
});

const deleteDocuments = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { documentId } = req.params;

  const fleet = await InventoryFleet.findById(productId);
  if (!fleet) {
    throw new NotFoundError('Fleet not found');
  }

  const documentIndex = fleet.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the product');
  }

  fleet.files.splice(documentIndex, 1);

  await fleet.save();

  res.status(200).json({
    success: true,
    message: 'Files deleted successfully',
  });
});

const updateDocuments = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { documentId } = req.params;
  const { name, notify, expiryDate, reminderDate } = req.body;

  const fleet = await InventoryFleet.findById(productId);
  if (!fleet) {
    throw new NotFoundError('Fleet not found');
  }

  const documentIndex = fleet.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the product');
  }

  fleet.files[documentIndex].name = name;
  fleet.files[documentIndex].notify = notify;
  fleet.files[documentIndex].expiryDate = expiryDate;
  fleet.files[documentIndex].reminderDate = reminderDate;

  await fleet.save();

  res.status(200).json({
    success: true,
    message: 'Files updated successfully',
  });
});

const getDocumentById = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error('Invalid Fleet ID');
  }
  const existingFleet = await InventoryFleet.findById(productId);
  const documents = existingFleet.files;
  res.status(200).json({
    success: true,
    data: documents,
  });
});

module.exports = {
  createFleet,
  getfleetbyid,
  getFleetsBytype,
  updateFleet,
  deleteFleet,
  deleteDocuments,
  updateDocuments,
  getDocumentById,
  uploadFleetFolder,
};
