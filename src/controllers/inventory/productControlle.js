const Product = require('../../models/inventory/Product');
const Organization = require('../../models/auth/Organization');
const Category = require('../../models/inventory/Category');
const mongoose = require('mongoose');
const PurchaseReceive = require('../../models/procurement/PurchaseReceive');
const PurchaseOrder = require('../../models/procurement/PurchaseOrder');
// const { createActivityLog } = require('../utilities/logUtils');
const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
const QRCode = require('qrcode');
// const {
//   recalculateAccountRunningBalanceAfterTransaction,
// } = require('../../utilities/transactionUtils');
const InventoryFleet = require('../../models/fleets/InventoryFleet');
const { asyncHandler } = require('../../middleware/errorHandler');

const createdProductByCategory = asyncHandler(async (req, res) => {
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
  const createdProduct = await Product.create(productData);

  if (
    productData.openingStock &&
    productData.openingStock > 0 &&
    productData.openingStockRate &&
    productData.openingStockRate > 0 &&
    inventoryInfo &&
    inventoryAccount !== ''
  ) {
    const accountUpdate = await Account.findByIdAndUpdate(
      inventoryAccount,
      {
        $inc: {
          amount:
            Number(productData.openingStock) *
            Number(productData.openingStockRate),
        },
      },
      {
        new: true,
      }
    );

    if (accountUpdate) {
      const openingTransaction = await Transaction.create({
        reference: createdProduct.productName,
        product: createdProduct._id,
        account: inventoryAccount,
        debit:
          Number(productData.openingStock) *
          Number(productData.openingStockRate),
        credit: 0,
        type: 'opening-stock',
        runningBalance: accountUpdate?.amount,
        organization: createdProduct.organization,
        company: createdProduct.company,
      });

      createdProduct.openingTransaction = openingTransaction._id;
      await createdProduct.save();
    }
  }
  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   actionId: createdProduct.productName,
  //   type: req.params.categoryType,
  //   organization: createdProduct.organization,
  //   company: createdProduct.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: createdProduct,
  });
});

const getAllProducts = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const products = await Product.find({
    organization: orgId,
  })
    .populate('category')
    .select('productName price inWarehouseQuantity mrq category unit');
  res.status(200).json({
    success: true,
    message: 'Product retrived successfully',
    data: products,
  });
});

const getproductGroupByCategory = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;

  const products = await Product.find({
    organization: orgId,
  })
    .select(
      'productName category serialNumber price inWarehouseQuantity inventoryAccount openingStock openingStockRate'
    )
    .populate('category', 'type');

  const groupedProducts = {
    goods: [],
    rentals: [],
    consumables: [],
    materials: [],
    vehicles: [],
  };

  products.forEach((product) => {
    if (product.category && product.category.type) {
      const categoryType = product.category.type;
      if (Object.prototype.hasOwnProperty.call(groupedProducts, categoryType)) {
        groupedProducts[categoryType].push(product);
      }
    }
  });

  res.status(200).json({
    success: true,
    message: 'Products grouped by category retrieved successfully',
    data: groupedProducts,
  });
});

const updateopeningstock = asyncHandler(async (req, res) => {
  const { openingStock } = req.body;

  await Promise.all(
    openingStock.map(async (item) => {
      const product = await Product.findById(item.productId);
      if (
        product &&
        product.openingStock &&
        product.openingStock > 0 &&
        product.openingStockRate &&
        product.openingStockRate > 0 &&
        product.inventoryInfo &&
        product.inventoryAccount !== '' &&
        product.openingStock !== item.openingStock &&
        product.openingStockRate !== item.openingStockRate
      ) {
        const openingTransaction = await Transaction.findByIdAndDelete(
          product.openingTransaction
        );
        if (openingTransaction) {
          await Account.findByIdAndUpdate(openingTransaction.account, {
            $inc: { amount: -Number(openingTransaction.debit) },
          });

          // await recalculateAccountRunningBalanceAfterTransaction(
          //   openingTransaction.account,
          //   openingTransaction.createdAt
          // );
        }

        product.openingStock = item.openingStock;
        product.openingStockRate = item.openingStockRate;

        if (product.inWarehouseQuantity === 0) {
          product.inWarehouseQuantity = item.openingStock;
        }
        await product.save();
      }
    })
  );

  res.status(200).json({
    success: true,
    message: 'Opening stocks updated successfully',
  });
});

const getproductstocked = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const products = await Product.find({
    organization: orgId,
    inWarehouseQuantity: { $gt: 0 },
  }).select('productName price inWarehouseQuantity');
  res.status(200).json({
    success: true,
    message: 'Opening stocks updated successfully',
    data: products,
  });
});

const goodsnrentals = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const categories = await Category.find({
    type: {
      $in: ['goods', 'rentals', 'vehicles'],
    },
    organization: orgId,
  }).select('_id');
  const products = await Product.find({
    category: {
      $in: categories,
    },
    inWarehouseQuantity: { $gt: 0 },
  });
  res.status(200).json({
    success: true,
    message: 'Opening stocks updated successfully',
    data: products,
  });
});

const getProductsByfiltered = asyncHandler(async (req, res) => {
  const { orgid, type } = req.params;
  const query = {
    type,
    organization: orgid,
  };
  const categories = await Category.find(query).select('_id');
  const products = await Product.find({
    category: {
      $in: categories,
    },
    inWarehouseQuantity: { $gt: 0 },
  });
  res.status(200).json({
    success: true,
    message: 'Opening stocks updated successfully',
    data: products,
  });
});

const getProductsByPurchaseOrder = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const products = await Product.find({
    organization: orgId,
  });
  res.status(200).json({
    success: true,
    message: 'Opening stocks updated successfully',
    data: products,
  });
});

const storerackrowdetailsQrcodes = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { productIds } = req.body;

  const products = await Product.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        _id: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
      },
    },
    {
      $lookup: {
        from: 'storerows',
        localField: 'storeRow',
        foreignField: '_id',
        as: 'storeRow',
      },
    },
    {
      $unwind: '$storeRow',
    },
    {
      $lookup: {
        from: 'racks',
        localField: 'rack',
        foreignField: '_id',
        as: 'rack',
      },
    },
    {
      $unwind: '$rack',
    },
    {
      $lookup: {
        from: 'stores',
        localField: 'store',
        foreignField: '_id',
        as: 'store',
      },
    },
    {
      $unwind: '$store',
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        name: '$productName',
        code: { $toUpper: '$code' },
        SKU: '$sku',
        row: '$storeRow.name',
        rowCode: { $toUpper: '$storeRow.code' },
        rackName: '$rack.name',
        rackCode: { $toUpper: '$rack.code' },
        storeName: '$store.name',
        storeCode: { $toUpper: '$store.code' },
      },
    },
  ]);

  const qrCodePromises = products.map(async (product) => {
    const qrCodeData = await QRCode.toDataURL(JSON.stringify(product));
    return {
      code: product.SKU || '',
      qrCode: qrCodeData,
    };
  });

  const result = await Promise.all(qrCodePromises);

  res.status(200).json({
    success: true,
    message: 'Opening stocks updated successfully',
    data: result,
  });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  // Check if the product exists
  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Delete the product
  await existingProduct.deleteOne();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'delete',
  //   actionId: existingProduct.productName,
  //   type: 'product',
  //   organization: existingProduct.organization,
  //   company: existingProduct.company,
  // });

  res
    .status(200)
    .json({ success: true, message: 'Product deleted successfully' });
});

const updatedProductlocation = asyncHandler(async (req, res) => {
  const { productIds, store, row, rack } = req.body;

  await Product.updateMany(
    { _id: { $in: productIds } },
    { $set: { store, storeRow: row, rack } }
  );

  res.status(200).json({
    success: true,
    message: 'Product inventory location updated successfully',
  });
});

const updateProduct = asyncHandler(async (req, res) => {
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
  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Update the product
  const updatedProduct = await Product.findByIdAndUpdate(
    productId,
    productData,
    { new: true }
  );

  if (
    productData.openingStock &&
    productData.openingStock > 0 &&
    productData.openingStockRate &&
    productData.openingStockRate > 0 &&
    inventoryInfo &&
    inventoryAccount !== '' &&
    existingProduct.openingStock !== productData.openingStock &&
    existingProduct.openingStockRate !== productData.openingStockRate
  ) {
    const openingTransaction = await Transaction.findByIdAndDelete(
      existingProduct.openingTransaction
    );

    if (openingTransaction) {
      await Account.findByIdAndUpdate(openingTransaction.account, {
        $inc: {
          amount: -Number(openingTransaction.debit),
        },
      });
      // await recalculateAccountRunningBalanceAfterTransaction(
      //   openingTransaction.account,
      //   openingTransaction.createdAt
      // );
    }

    const accountUpdate = await Account.findByIdAndUpdate(
      inventoryAccount,
      {
        $inc: {
          amount:
            Number(productData.openingStock) *
            Number(productData.openingStockRate),
        },
      },
      {
        new: true,
      }
    );

    if (accountUpdate) {
      const openingTransaction = await Transaction.create({
        reference: updatedProduct.productName,
        product: updatedProduct._id,
        account: inventoryAccount,
        debit:
          Number(productData.openingStock) *
          Number(productData.openingStockRate),
        credit: 0,
        type: 'opening-stock',
        runningBalance: accountUpdate?.amount,
        organization: updatedProduct.organization,
        company: updatedProduct.company,
      });

      updatedProduct.openingTransaction = openingTransaction._id;
      await updatedProduct.save();
    }
  }

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'update',
  //     actionId: updatedProduct.productName,
  //     type: productData.categoryType,
  //     organization: updatedProduct.organization,
  //     company: updatedProduct.company,
  //   });
  res.status(200).json({ success: true, data: updatedProduct });
});

const updateProductaddTags = asyncHandler(async (req, res) => {
  const updatedOrgWithTags = await Organization.findByIdAndUpdate(
    req.params.id,
    {
      $push: { tags: req.body.tags },
    },
    { new: true }
  );
  res.status(200).json({
    success: true,
    message: 'Tags updated successfully',
    data: updatedOrgWithTags,
  });
});

const getTags = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id);
  res.status(200).json({
    success: true,
    message: 'Tags fetched successfully',
    data: org.tags,
  });
});

// get product by id
const getproductbyid = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id)
    .populate('salesAccount')
    .populate('purchaseAccount')
    .populate('inventoryAccount')
    .populate('category');
  res.status(200).json({
    success: true,
    message: 'Tags fetched successfully',
    data: product,
  });
});

const deleteProductDocument = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { documentId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const documentIndex = product.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new Error('Files not found for the product');
  }

  product.files.splice(documentIndex, 1);

  await product.save();

  res
    .status(200)
    .json({ success: true, message: 'Files deleted successfully' });
});

//router for editing files of a project
const updateDocuments = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const { documentId } = req.params;
  const { name, notify, expiryDate, reminderDate } = req.body;

  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const documentIndex = product.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new Error('Files not found for the product');
  }

  // Update the document details
  product.files[documentIndex].name = name;
  product.files[documentIndex].notify = notify;
  product.files[documentIndex].expiryDate = expiryDate;
  product.files[documentIndex].reminderDate = reminderDate;

  // Save the updated client
  await product.save();

  res.status(200).json({
    success: true,
    message: 'Files updated successfully',
    data: product,
  });
});

// router for fetching files of a project
const getDocumentById = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const existingProduct = await Product.findById(productId);
  const documents = existingProduct.files;
  res.status(200).json({
    success: true,
    message: 'Files updated successfully',
    data: documents,
  });
});

const getVehicals = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;

  // const categories = await Category.find({
  //   type: "vehicles",
  //   organization: orgId,
  // }).select("_id");

  // const products = await Product.find({
  //   category: {
  //     $in: categories,
  //   },
  // }).populate("category");

  const vehicles = await InventoryFleet.find({
    organization: orgId,
    rentalType: 'vehicle',
  }).populate('category');

  const vehiclesWithStatus = vehicles.map((vehicle) => {
    let status;
    if (vehicle.inWarehouseQuantity === 0) {
      status = 'Out of Stock';
    } else {
      status = 'Available'; // Default status
    }
    return {
      ...vehicle.toObject(),
      status,
    };
  });
  res.status(200).json({
    success: true,
    message: 'Files retrived successfully',
    data: vehiclesWithStatus,
  });
});

const getEquipments = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;

  const equipments = await InventoryFleet.find({
    organization: orgId,
    rentalType: 'equipment',
  }).populate('category');

  const equipmentsWithStatus = equipments.map((equipment) => {
    let status;
    if (equipment.inWarehouseQuantity === 0) {
      status = 'Out of Stock';
    } else {
      status = 'Available'; // Default status
    }
    return {
      ...equipment.toObject(),
      status,
    };
  });

  res.status(200).json({
    success: true,
    message: 'Files retrived successfully',
    data: equipmentsWithStatus,
  });
});

function calculateReorderStatus(product) {
  let status;
  if (product.inWarehouseQuantity === 0) {
    status = 'Out of stock';
  } else if (product.inWarehouseQuantity < product.mrq) {
    status = 'Limited';
  }
  return status;
}

const reordernRestock = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const query = {
    organization: orgid,
    // mrq: { $ne: null },
    inWarehouseQuantity: { $ne: null },
    $or: [
      { $expr: { $lt: ['$inWarehouseQuantity', '$mrq'] } },
      { inWarehouseQuantity: 0 },
    ],
  };

  let products = await Product.find(query)
    .sort({ updatedAt: -1 })
    .select('productName inWarehouseQuantity mrq thumbnail');

  products = products.map((product) => ({
    ...product.toObject(),
    status: calculateReorderStatus(product),
  }));
  res.status(200).json({
    success: true,
    message: 'Files retrived successfully',
    data: products,
  });
});

const getOrderUpdate = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const purchaseOrder = await PurchaseOrder.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        items: 1,
        date: 1,
      },
    },
  ]);
  const purchaseReceived = await PurchaseReceive.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
      },
    },
    {
      $sort: {
        paymentDate: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        items: 1,
        paymentDate: 1,
      },
    },
  ]);

  let poItems = purchaseOrder?.flatMap((po) => po.items);
  let prItems = purchaseReceived?.flatMap((pr) => pr.items);

  poItems = poItems?.slice(0, 5);
  prItems = prItems?.slice(0, 5);

  res.status(200).json({
    success: true,
    message: 'Files retrived successfully',
    data: {
      purchaseOrders: poItems || [],
      purchaseReceives: prItems || [],
    },
  });
});

const getCategoriesByType = asyncHandler(async (req, res) => {
  const { orgid, type } = req.params;
  const categories = await Category.find({
    type: {
      $in: type,
    },
    organization: orgid,
  }).select('_id');

  const products = await Product.find({
    category: {
      $in: categories,
    },
  }).populate('category');

  // Calculate status for each product
  const productsWithStatus = products.map((product) => {
    let status;
    if (product.inWarehouseQuantity === 0) {
      status = 'OutOfStock';
    } else if (product.inWarehouseQuantity > product.mrq) {
      status = 'Available';
    } else if (product.inWarehouseQuantity < product.mrq) {
      status = 'Limited';
    } else {
      status = 'Available'; // Default status
    }
    return {
      ...product.toObject(),
      status,
    };
  });

  res.status(200).json({
    success: true,
    message: 'Files retrived successfully',
    data: productsWithStatus,
  });
});

const getProducrsByCategory = asyncHandler(async (req, res) => {
  const { orgid, category } = req.params;

  const { search } = req.query;

  const categoryIds = await Category.find({
    type: category,
    organization: orgid,
  }).distinct('_id');

  const query = {
    category: { $in: categoryIds },
  };

  if (search && search !== '') {
    query.productName = { $regex: search, $options: 'i' };
  }

  const products = await Product.find(query).select(
    'productName thumbnail sku inWarehouseQuantity price'
  );
  res.status(200).json({
    success: true,
    message: 'Files retrived successfully',
    data: products,
  });
});

function calculateStatus(product) {
  let status;
  if (product.inWarehouseQuantity === 0) {
    status = 'OutOfStock';
  } else if (product.inWarehouseQuantity > product.mrq) {
    status = 'Available';
  } else if (product.inWarehouseQuantity < product.mrq) {
    status = 'Limited';
  } else {
    status = 'Available'; // Default status
  }
  return status;
}
const productFilterByType = asyncHandler(async (req, res) => {
  const { orgid, type } = req.params;
  const {
    filter_status,
    //   filter_validity,
    filter_category,
    filter_tag,
    filter_store,
    filter_rentType,
    search_query,
  } = req.query;

  const categories = await Category.find({
    type: { $in: type },
    organization: orgid,
  }).select('_id');

  const query = {
    category: { $in: categories },
  };

  if (
    filter_store &&
    filter_store !== '' &&
    filter_store !== 'undefined' &&
    filter_store !== 'null'
  ) {
    query.store = filter_store;
  }

  if (filter_tag) {
    query.tags = { $in: filter_tag.split(',') };
  }
  if (search_query) {
    query.productName = {
      $regex: search_query,
      $options: 'i',
    };
  }
  let products = await Product.find(query)
    .populate('category')
    .sort({ createdAt: -1 });

  products = products.map((product) => ({
    ...product.toObject(),
    status: calculateStatus(product),
  }));

  if (filter_status) {
    products = products.filter((product) => product.status === filter_status);
  }

  if (filter_category) {
    products = products.filter(
      (product) => product.category._id.toString() === filter_category
    );
  }

  if (filter_rentType) {
    products = products.filter(
      (product) => product.rentType === filter_rentType
    );
  }
  res.status(200).json({
    success: true,
    message: 'Files retrived successfully',
    data: products,
  });
});

module.exports = {
  createdProductByCategory,
  productFilterByType,
  getAllProducts,
  getproductbyid,
  updateProductaddTags,
  getTags,
  deleteProductDocument,
  updateDocuments,
  getproductGroupByCategory,
  updateopeningstock,
  getproductstocked,
  goodsnrentals,
  getProductsByfiltered,
  getProductsByPurchaseOrder,
  storerackrowdetailsQrcodes,
  getEquipments,
  reordernRestock,
  getOrderUpdate,
  getCategoriesByType,
  getProducrsByCategory,
  deleteProduct,
  updatedProductlocation,
  updateProduct,
  getDocumentById,
  getVehicals,
};
