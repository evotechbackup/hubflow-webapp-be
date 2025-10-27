const PurchaseReceived = require('../../models/procurement/PurchaseReceive');
const LastInsertedId = require('../../models/master/LastInsertedID');
const PurchaseOrder = require('../../models/procurement/PurchaseOrder');
const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
// const Product = require("../../models/Product");
const Vendor = require('../../models/procurement/Vendor');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../utils/approvalUtils');
const { createActivityLog } = require('../../utils/logUtils');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');
// const Category = require("../../models/Category");
// const InventoryFleet = require("../../models/fleets/InventoryFleet");

const approvePurchaseReceived = async (purchaseReceived) => {
  if (purchaseReceived.status !== 'partial') {
    const purchaseorder = await PurchaseOrder.findById(
      purchaseReceived.purchaseOrder
    );
    purchaseorder.status = 'received';
    await purchaseorder.save();
  }

  const vendor = await Vendor.findById(purchaseReceived.vendor).select(
    'displayName'
  );

  const inventoryUpdate = await Account.findOne({
    accountName: 'Inventory Asset',
    organization: purchaseReceived.organization,
  });

  let totalInventory = 0;

  for (let i = 0; i < purchaseReceived.items.length; i++) {
    const item = purchaseReceived.items[i];
    totalInventory += Number(item.amount || 0) - Number(item.inTransit || 0);
    // if (item.itemId && item.itemId !== '') {
    //   await Product.updateOne(
    //     { _id: item.itemId },
    //     {
    //       $inc: {
    //         inWarehouseQuantity: Number(item.received),
    //         quantityToBeReceived: Math.max(-Number(item.received), 0),
    //         quantityToBeBilled: Number(item.received),
    //       },
    //     }
    //   );

    //   const transaction = new Transaction({
    //     product: item.itemId,
    //     type: 'purchase receive',
    //     project: orderManagement?.project || null,
    //     purchaseOrder: purchaseReceived.purchaseOrder || null,
    //     vendor: purchaseReceived.vendor,
    //     id: vendor?.displayName || '',
    //     reference: purchaseReceived.id,
    //     debit: Number(item.received * item.price),
    //     organization: purchaseReceived.organization,
    //     company: purchaseReceived.company,
    //   });
    //   await transaction.save();
    // } else if (item.fleetId && item.fleetId !== '') {
    //   await InventoryFleet.updateOne(
    //     { _id: item.fleetId },
    //     {
    //       $inc: {
    //         inWarehouseQuantity: Number(item.received),
    //         quantityToBeReceived: Math.max(-Number(item.received), 0),
    //         quantityToBeBilled: Number(item.received),
    //       },
    //     }
    //   );
    // }
  }

  inventoryUpdate.amount += Number(totalInventory);
  await inventoryUpdate.save();

  const transaction = new Transaction({
    account: inventoryUpdate._id,
    type: 'purchase receive',
    purchaseOrder: purchaseReceived.purchaseOrder || null,
    vendor: purchaseReceived.vendor,
    id: vendor?.displayName || '',
    reference: purchaseReceived.id,
    debit: Number(totalInventory),
    runningBalance: inventoryUpdate?.amount,
    organization: purchaseReceived.organization,
    company: purchaseReceived.company,
  });
  await transaction.save();
};

const createPartialPurchaseReceive = asyncHandler(async (req, res) => {
  const {
    vendor,
    purchaseOrder,
    receivedDate,
    notes,
    termsCondition,
    items,
    totalBalance,
    company,
    organization,
    currentId,
    orderId,
    contactPerson,
    docAttached,
  } = req.body;

  const partialId = currentId.split('-P-');
  const newId =
    totalBalance === 0
      ? partialId[0]
      : `${partialId[0]}-P-${Number(partialId[1]) + 1}`;

  const hasApproval = await ifHasApproval('purchasereceives', organization);

  const newPurchaseReceived = new PurchaseReceived({
    vendor,
    purchaseOrder,
    id: newId,
    receivedDate,
    items,
    status: totalBalance === 0 ? 'received' : 'partial',
    notes,
    termsCondition,
    company,
    organization,
    user: req.id,
    order: orderId || null,
    contactPerson,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
  });
  const savedPurchaseReceived = await newPurchaseReceived.save();

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'purchasereceive',
    actionId: savedPurchaseReceived.id,
    organization: savedPurchaseReceived.organization,
    company: savedPurchaseReceived.company,
  });

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'purchasereceives',
      'pending',
      savedPurchaseReceived.organization,
      savedPurchaseReceived.company,
      savedPurchaseReceived.id,
      'Purchase Received',
      'purchaseReceive',
      savedPurchaseReceived._id
    );
  } else {
    await approvePurchaseReceived(savedPurchaseReceived);
  }

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(savedPurchaseReceived.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Purchase Received created successfully',
    data: savedPurchaseReceived,
  });
});

const createPurchaseReceive = asyncHandler(async (req, res) => {
  const orderId = req.params.orderId === '0' ? null : req.params.orderId;
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'purchaseReceived',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({
      entity: 'purchaseReceived',
      organization,
    });
  }
  if (id !== undefined && !isNaN(parseInt(id))) {
    lastInsertedId.lastId = parseInt(id);
    await lastInsertedId.save();
  } else {
    lastInsertedId.lastId += 1;
    await lastInsertedId.save();
  }
  const { prefix } = req.body;
  const purchaseReceivedPrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }
  const {
    vendor,
    purchaseOrder,
    receivedDate,
    notes,
    termsCondition,
    items,
    totalBalance,
    status,
    company,
    store,
    contactPerson,
    docAttached,
    // newProductCategory,
  } = req.body;

  const partialId = await PurchaseReceived.find({
    purchaseOrder,
    status: 'partial',
  })
    .sort({ receivedDate: 1 })
    .countDocuments();

  let paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  if (partialId === 0) {
    paddedId += totalBalance === 0 ? '' : '-P-1';
  } else {
    paddedId += totalBalance === 0 ? '' : `-P-${partialId + 1}`;
  }

  const hasApproval = await ifHasApproval('purchasereceives', organization);

  const newPurchaseReceived = new PurchaseReceived({
    vendor,
    purchaseOrder,
    id: customID ? customID : purchaseReceivedPrefix + paddedId,
    receivedDate,
    items,
    status,
    notes,
    termsCondition,
    company,
    organization,
    user: req.id,
    order: orderId,
    contactPerson,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
    store,
  });
  const savedPurchaseReceived = await newPurchaseReceived.save();

  // let uncategorizedProduct;
  // let productAssetAccount = await Account.findOne({
  //   accountName:
  //     newProductCategory === 'materials'
  //       ? 'Materials'
  //       : newProductCategory === 'consumables'
  //         ? 'Consumables'
  //         : 'Equipments',
  //   organization,
  // });

  // if (!productAssetAccount) {
  //   throw new NotFoundError(
  //     `Product asset account not found for category: ${newProductCategory}`
  //   );
  // }

  // Pre-fetch category outside the loop for efficiency
  // const categoryToFind = await Category.findOne({
  //   company,
  //   organization,
  //   categoryName:
  //     newProductCategory === 'materials'
  //       ? 'Project Materials'
  //       : 'Uncategorized',
  //   type: newProductCategory,
  // });

  // if (!categoryToFind) {
  //   throw new NotFoundError(
  //     `Category not found for type: ${newProductCategory}`
  //   );
  // }
  // uncategorizedProduct = categoryToFind._id;

  // for (let i = 0; i < items.length; i++) {
  //   const item = items[i];
  //   if (item?.addToInventory) {
  //     const product = await Product.create({
  //       company,
  //       organization,
  //       productName: item?.productName,
  //       price: item?.price,
  //       unit: item?.unit,
  //       category: uncategorizedProduct,
  //       inventoryAccount: productAssetAccount._id,
  //     });

  //     savedPurchaseReceived.items[i].itemId = product._id;
  //   }
  // else if (item?.addToInventory && item?.type === "fleet") {
  //   const fleet = await InventoryFleet.create({
  //     company,
  //     organization,
  //     productName: item?.productName,
  //     price: item?.price,
  //     unit: item?.unit,
  //     category: uncategorizedProduct,
  //     inventoryAccount: productAssetAccount._id,
  //   });

  //   savedPurchaseReceived.items[i].fleetId = fleet._id;
  // }
  // }

  // await savedPurchaseReceived.save();

  // if (store) {
  // const productIds = savedPurchaseReceived.items.map((item) => item.itemId);
  // await Product.updateMany(
  //   { _id: { $in: productIds } },
  //   {
  //     $set: {
  //       store: store,
  //       storeAddedDate: new Date(receivedDate),
  //     },
  //   }
  // );
  // }

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'purchasereceive',
    actionId: savedPurchaseReceived.id,
    organization: savedPurchaseReceived.organization,
    company: savedPurchaseReceived.company,
  });

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'purchasereceives',
      'pending',
      savedPurchaseReceived.organization,
      savedPurchaseReceived.company,
      savedPurchaseReceived.id,
      'Purchase Received',
      'purchaseReceive',
      savedPurchaseReceived._id
    );
  } else {
    await approvePurchaseReceived(savedPurchaseReceived);
  }

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(savedPurchaseReceived.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Purchase Received created successfully',
    data: savedPurchaseReceived,
  });
});

const updatePurchaseReceive = asyncHandler(async (req, res) => {
  const { ids } = req.params;
  const {
    id,
    vendor,
    purchaseOrder,
    receivedDate,
    notes,
    termsCondition,
    items,
    // newProductCategory,
    totalBalance,
    status,
    store,
    contactPerson,
    docAttached,
  } = req.body;

  const purchaseReceived = await PurchaseReceived.findById(ids);
  if (!purchaseReceived) {
    throw new NotFoundError('Purchase Received not found');
  }

  if (
    purchaseReceived.approval === 'approved1' ||
    purchaseReceived.approval === 'approved2' ||
    purchaseReceived.approval === 'none'
  ) {
    if (purchaseReceived.status !== 'partial') {
      const purchaseorder = await PurchaseOrder.findById(
        purchaseReceived.purchaseOrder
      );
      purchaseorder.status = 'pending';
      await purchaseorder.save();
    }

    let totalInventory = 0;

    for (let i = 0; i < purchaseReceived.items.length; i++) {
      const item = purchaseReceived.items[i];
      totalInventory += Number(item.amount || 0) - Number(item.inTransit || 0);

      // if (item.itemId && item.itemId !== '') {
      //   await Product.updateOne(
      //     { _id: item.itemId },
      //     {
      //       $inc: {
      //         inWarehouseQuantity: -Number(item.received),
      //         quantityToBeReceived: Number(item.received),
      //         quantityToBeBilled: -Number(item.received),
      //       },
      //     }
      //   );
      // } else if (item.fleetId && item.fleetId !== '') {
      //   await InventoryFleet.updateOne(
      //     { _id: item.fleetId },
      //     {
      //       $inc: {
      //         inWarehouseQuantity: -Number(item.received),
      //         quantityToBeReceived: Number(item.received),
      //         quantityToBeBilled: -Number(item.received),
      //       },
      //     }
      //   );
      // }
    }

    await Account.findOneAndUpdate(
      {
        accountName: 'Inventory Asset',
        organization: purchaseReceived.organization,
      },
      { $inc: { amount: -Number(totalInventory) } }
    );

    await Transaction.deleteMany({
      id: purchaseReceived.id,
      type: 'purchase receive',
      organization: purchaseReceived.organization,
    });
  }

  // if (store) {
  //   const productIds = items.map((item) => item.itemId);
  // await Product.updateMany(
  //   { _id: { $in: productIds } },
  //   {
  //     $set: {
  //       store: store,
  //       storeAddedDate: new Date(receivedDate),
  //     },
  //   }
  // );
  // }

  const hasApproval = await ifHasApproval(
    'purchasereceives',
    purchaseReceived.organization
  );

  purchaseReceived.vendor = vendor;
  purchaseReceived.id = id;
  purchaseReceived.purchaseOrder = purchaseOrder;
  purchaseReceived.receivedDate = receivedDate;
  purchaseReceived.notes = notes;
  purchaseReceived.termsCondition = termsCondition;
  purchaseReceived.items = items;
  purchaseReceived.totalBalance = totalBalance;
  purchaseReceived.status = status;
  purchaseReceived.store = store;
  purchaseReceived.user = req.id;
  purchaseReceived.contactPerson = contactPerson;
  purchaseReceived.docAttached = docAttached;
  purchaseReceived.approval = hasApproval ? 'pending' : 'none';
  purchaseReceived.verifiedBy = null;
  purchaseReceived.verifiedAt = null;
  purchaseReceived.reviewedBy = null;
  purchaseReceived.reviewedAt = null;
  purchaseReceived.approvedBy1 = null;
  purchaseReceived.approvedAt1 = null;
  purchaseReceived.approvedBy2 = null;
  purchaseReceived.approvedAt2 = null;
  purchaseReceived.acknowledgedBy = null;
  purchaseReceived.acknowledgedAt = null;
  // purchaseReceived.order = order;
  const updatedPurchaseReceived = await purchaseReceived.save();

  // let uncategorizedProduct;
  // let productAssetAccount = await Account.findOne({
  //   accountName:
  //     newProductCategory === 'materials'
  //       ? 'Materials'
  //       : newProductCategory === 'consumables'
  //         ? 'Consumables'
  //         : 'Equipments',
  //   organization: updatedPurchaseReceived.organization,
  // });

  // if (!productAssetAccount) {
  //   throw new NotFoundError(
  //     `Product asset account not found for category: ${newProductCategory}`
  //   );
  // }

  // const categoryToFind = await Category.findOne({
  //   company: updatedPurchaseReceived.company,
  //   organization: updatedPurchaseReceived.organization,
  //   categoryName:
  //     newProductCategory === 'materials'
  //       ? 'Project Materials'
  //       : 'Uncategorized',
  //   type: newProductCategory,
  // });

  // if (!categoryToFind) {
  //   return res.status(400).json({
  //     error: `Category not found for type: ${newProductCategory}`,
  //   });
  // }
  // uncategorizedProduct = categoryToFind._id;

  // for (let i = 0; i < items.length; i++) {
  //   const item = items[i];
  //   if (item?.addNewProduct) {
  //     const product = await Product.create({
  //       company: updatedPurchaseReceived.company,
  //       organization: updatedPurchaseReceived.organization,
  //       productName: item?.productName,
  //       price: item?.price,
  //       unit: item?.unit,
  //       category: uncategorizedProduct,
  //       inventoryAccount: productAssetAccount._id,
  //     });

  //     updatedPurchaseReceived.items[i].itemId = product._id;
  //   }
  // }

  // await updatedPurchaseReceived.save();

  // if (store) {
  //   const productIds = updatedPurchaseReceived.items.map(
  //     (item) => item.itemId
  //   );
  //   await Product.updateMany(
  //     { _id: { $in: productIds } },
  //     {
  //       $set: {
  //         store: store,
  //         storeAddedDate: new Date(receivedDate),
  //       },
  //     }
  //   );
  // }

  if (!hasApproval) {
    await approvePurchaseReceived(updatedPurchaseReceived);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'purchasereceive',
    actionId: updatedPurchaseReceived.id,
    organization: purchaseReceived.organization,
    company: purchaseReceived.company,
  });

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(purchaseReceived.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Purchase Received updated successfully',
    data: updatedPurchaseReceived,
  });
});

const revisedPurchaseReceived = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    receivedDate,
    notes,
    termsCondition,
    items,
    // newProductCategory,
    totalBalance,
    status,
    store,
    contactPerson,
    docAttached,
  } = req.body;

  const purchaseReceived = await PurchaseReceived.findById(id);
  if (!purchaseReceived) {
    throw new NotFoundError('Purchase Received not found');
  }

  const baseId = purchaseReceived.id.split('-REV')[0];
  const currentRevision = purchaseReceived.id.includes('-REV')
    ? parseInt(purchaseReceived.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  if (
    purchaseReceived.approval === 'approved1' ||
    purchaseReceived.approval === 'approved2' ||
    purchaseReceived.approval === 'none'
  ) {
    if (purchaseReceived.status !== 'partial') {
      const purchaseorder = await PurchaseOrder.findById(
        purchaseReceived.purchaseOrder
      );
      purchaseorder.status = 'pending';
      await purchaseorder.save();
    }

    let totalInventory = 0;

    for (let i = 0; i < purchaseReceived.items.length; i++) {
      const item = purchaseReceived.items[i];
      totalInventory += Number(item.amount || 0) - Number(item.inTransit || 0);

      //   if (item.itemId && item.itemId !== '') {
      //     await Product.updateOne(
      //       { _id: item.itemId },
      //       {
      //         $inc: {
      //           inWarehouseQuantity: -Number(item.received),
      //           quantityToBeReceived: Number(item.received),
      //           quantityToBeBilled: -Number(item.received),
      //         },
      //       }
      //     );
      //   } else if (item.fleetId && item.fleetId !== '') {
      //     await InventoryFleet.updateOne(
      //       { _id: item.fleetId },
      //       {
      //         $inc: {
      //           inWarehouseQuantity: -Number(item.received),
      //           quantityToBeReceived: Number(item.received),
      //           quantityToBeBilled: -Number(item.received),
      //         },
      //       }
      //     );
      //   }
    }

    await Account.findOneAndUpdate(
      {
        accountName: 'Inventory Asset',
        organization: purchaseReceived.organization,
      },
      { $inc: { amount: -Number(totalInventory) } }
    );

    await Transaction.deleteMany({
      id: purchaseReceived.id,
      type: 'purchase receive',
      organization: purchaseReceived.organization,
    });
  }

  // if (store) {
  //   const productIds = items.map((item) => item.itemId);
  //   await Product.updateMany(
  //     { _id: { $in: productIds } },
  //     {
  //       $set: {
  //         store: store,
  //         storeAddedDate: new Date(receivedDate),
  //       },
  //     }
  //   );
  // }

  const hasApproval = await ifHasApproval(
    'purchasereceives',
    purchaseReceived.organization
  );

  purchaseReceived.receivedDate = receivedDate;
  purchaseReceived.notes = notes;
  purchaseReceived.termsCondition = termsCondition;
  purchaseReceived.items = items;
  purchaseReceived.totalBalance = totalBalance;
  purchaseReceived.status = status;
  purchaseReceived.store = store;
  purchaseReceived.user = req.id;
  purchaseReceived.contactPerson = contactPerson;
  purchaseReceived.docAttached = docAttached;
  purchaseReceived.approval = hasApproval ? 'pending' : 'none';
  purchaseReceived.verifiedBy = null;
  purchaseReceived.verifiedAt = null;
  purchaseReceived.reviewedBy = null;
  purchaseReceived.reviewedAt = null;
  purchaseReceived.approvedBy1 = null;
  purchaseReceived.approvedAt1 = null;
  purchaseReceived.approvedBy2 = null;
  purchaseReceived.approvedAt2 = null;
  purchaseReceived.acknowledgedBy = null;
  purchaseReceived.acknowledgedAt = null;
  // purchaseReceived.order = order;
  purchaseReceived.id = newId;
  const updatedPurchaseReceived = await purchaseReceived.save();

  // let uncategorizedProduct;
  // let productAssetAccount = await Account.findOne({
  //   accountName:
  //     newProductCategory === 'materials'
  //       ? 'Materials'
  //       : newProductCategory === 'consumables'
  //         ? 'Consumables'
  //         : 'Equipments',
  //   organization: updatedPurchaseReceived.organization,
  // });

  // if (!productAssetAccount) {
  //   throw new NotFoundError(
  //     `Product asset account not found for category: ${newProductCategory}`
  //   );
  // }

  // const categoryToFind = await Category.findOne({
  //   company: updatedPurchaseReceived.company,
  //   organization: updatedPurchaseReceived.organization,
  //   categoryName:
  //     newProductCategory === 'materials'
  //       ? 'Project Materials'
  //       : 'Uncategorized',
  //   type: newProductCategory,
  // });

  // if (!categoryToFind) {
  //   return res.status(400).json({
  //     error: `Category not found for type: ${newProductCategory}`,
  //   });
  // }
  // uncategorizedProduct = categoryToFind._id;

  // for (let i = 0; i < items.length; i++) {
  //   const item = items[i];
  //   if (item?.addNewProduct) {
  //     const product = await Product.create({
  //       company: updatedPurchaseReceived.company,
  //       organization: updatedPurchaseReceived.organization,
  //       productName: item?.productName,
  //       price: item?.price,
  //       unit: item?.unit,
  //       category: uncategorizedProduct,
  //       inventoryAccount: productAssetAccount._id,
  //     });

  //     updatedPurchaseReceived.items[i].itemId = product._id;
  //   }
  // }

  // await updatedPurchaseReceived.save();

  // if (store) {
  //   const productIds = updatedPurchaseReceived.items.map(
  //     (item) => item.itemId
  //   );
  //   await Product.updateMany(
  //     { _id: { $in: productIds } },
  //     {
  //       $set: {
  //         store: store,
  //         storeAddedDate: new Date(receivedDate),
  //       },
  //     }
  //   );
  // }

  if (!hasApproval) {
    await approvePurchaseReceived(updatedPurchaseReceived);
  }

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'purchasereceive',
    actionId: updatedPurchaseReceived.id,
    organization: purchaseReceived.organization,
    company: purchaseReceived.company,
  });

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(purchaseReceived.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Purchase Received updated successfully',
    data: updatedPurchaseReceived,
  });
});

const getPurchaseReceivedByAgent = asyncHandler(async (req, res) => {
  const purchase = await PurchaseReceived.find({
    user: req.id,
  })
    .populate('vendor')
    .populate('purchaseOrder');
  res.status(200).json({
    success: true,
    message: 'Purchase Received fetched successfully',
    data: purchase,
  });
});

const getPurchaseReceivesByOrganization = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const purchase = await PurchaseReceived.find({
    organization: orgId,
  })
    .populate('vendor')
    .populate('purchaseOrder');
  res.status(200).json({
    success: true,
    message: 'Purchase Received fetched successfully',
    data: purchase,
  });
});

const getPurchaseReceiveLength = asyncHandler(async (req, res) => {
  const purchaseReceiveCount = await PurchaseReceived.countDocuments();
  res.status(200).json({
    success: true,
    message: 'Purchase Received length fetched successfully',
    data: purchaseReceiveCount,
  });
});

const getPurchaseReceiveById = asyncHandler(async (req, res) => {
  const quotationId = req.params.id;

  const purchase = await PurchaseReceived.findById(quotationId)
    .populate('vendor')
    .populate('company')
    .populate('store', 'name')
    .populate({
      path: 'purchaseOrder',
      populate: {
        path: 'items.itemId',
        model: 'Product',
      },
    })
    .populate('organization')
    .populate('user', ['signature', 'profileType', 'fullName', 'userName'])
    .populate('reviewedBy', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('verifiedBy', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('approvedBy1', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ])
    .populate('approvedBy2', [
      'signature',
      'userName',
      'profileType',
      'fullName',
    ]);

  res.status(200).json({
    success: true,
    message: 'Purchase Received fetched successfully',
    data: purchase,
  });
});

const getPurchaseReceiveByPurchaseOrder = asyncHandler(async (req, res) => {
  const purchaseId = req.params.id;

  const purchase = await PurchaseReceived.findOne(
    {
      purchaseOrder: purchaseId,
    },
    {},
    { sort: { createdAt: -1 } }
  )
    .populate('vendor')
    .populate('company')
    .populate('purchaseOrder');

  res.status(200).json({
    success: true,
    message: 'Purchase Received fetched successfully',
    data: purchase,
  });
});

const getPurchaseReceiveByVendorId = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  const purchaseReceives = await PurchaseReceived.find({
    vendor: vendorId,
    valid: true,
  })
    .populate('purchaseOrder')
    .populate({
      path: 'purchaseOrder',
      populate: {
        path: 'items.itemId',
        model: 'Product',
        select: 'productName',
      },
    });

  if (!purchaseReceives || purchaseReceives.length === 0) {
    throw new NotFoundError(
      'No purchase receives found for the specified vendor.'
    );
  }
  function filterPurchaseData(purchaseData) {
    return purchaseData.map((purchaseReceive) => {
      if (
        purchaseReceive.purchaseOrder &&
        purchaseReceive.purchaseOrder.items
      ) {
        const modifiedItems = purchaseReceive.purchaseOrder.items.map(
          (item) => {
            const newItem = { ...item.toObject() };
            return newItem;
          }
        );

        return {
          ...purchaseReceive.toObject(),
          purchaseOrder: {
            ...purchaseReceive.purchaseOrder.toObject(),
            items: modifiedItems,
          },
        };
      } else {
        return purchaseReceive.toObject();
      }
    });
  }
  const modifiedPurchaseReceives = filterPurchaseData(purchaseReceives);

  res.status(200).json({
    success: true,
    message: 'Purchase Receives fetched successfully',
    data: modifiedPurchaseReceives,
  });
});

const approvePurchaseReceive = asyncHandler(async (req, res) => {
  const { approval, approvedBy } = req.body;

  const purchaseReceived = await PurchaseReceived.findById(req.params.id);

  if (!purchaseReceived) {
    throw new NotFoundError('Purchase Received not found');
  }

  const oldApproval = purchaseReceived.approval;

  purchaseReceived.approval = approval;
  if (approval === 'approved1') {
    purchaseReceived.approvedBy1 = approvedBy || null;
    purchaseReceived.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    purchaseReceived.approvedBy2 = approvedBy || null;
    purchaseReceived.approvedAt2 = new Date();
  }

  const updatedPurchaseReceived = await purchaseReceived.save();

  if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
    await approvePurchaseReceived(updatedPurchaseReceived);

    if (approval === 'approved1') {
      await findNextApprovalLevelAndNotify(
        'purchasereceives',
        approval,
        updatedPurchaseReceived.organization,
        updatedPurchaseReceived.company,
        updatedPurchaseReceived.id,
        'Purchase Received',
        'purchaseReceive',
        updatedPurchaseReceived._id
      );
    }

    await createActivityLog({
      userId: req.id,
      action: 'approve',
      type: 'purchasereceive',
      actionId: updatedPurchaseReceived.id,
      organization: updatedPurchaseReceived.organization,
      company: updatedPurchaseReceived.company,
    });
  }
  res.status(201).json({
    success: true,
    message: 'Purchase Received approved successfully',
    data: updatedPurchaseReceived,
  });
});

const rejectPurchaseReceive = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;
  const updatedPurchaseReceived = await PurchaseReceived.findOneAndUpdate(
    { _id: req.params.id },
    {
      approval: 'rejected',
      approvalComment: approvalComment || null,
      verifiedBy: null,
      verifiedAt: null,
      approvedBy1: null,
      approvedAt1: null,
      approvedBy2: null,
      approvedAt2: null,
      reviewedBy: null,
      reviewedAt: null,
      acknowledgedBy: null,
      acknowledgedAt: null,
    }
  );

  if (
    updatedPurchaseReceived.approval === 'approved1' ||
    updatedPurchaseReceived.approval === 'approved2'
  ) {
    if (updatedPurchaseReceived.status !== 'partial') {
      const purchaseorder = await PurchaseOrder.findById(
        updatedPurchaseReceived.purchaseOrder
      );
      purchaseorder.status = 'pending';
      await purchaseorder.save();
    }

    let totalInventory = 0;

    for (let i = 0; i < updatedPurchaseReceived.items.length; i++) {
      const item = updatedPurchaseReceived.items[i];
      totalInventory += Number(item.amount || 0) - Number(item.inTransit || 0);

      // if (item.itemId && item.itemId !== '') {
      //   await Product.updateOne(
      //     { _id: item.itemId },
      //     {
      //       $inc: {
      //         inWarehouseQuantity: -Number(item.received),
      //         quantityToBeReceived: Number(item.received),
      //         quantityToBeBilled: -Number(item.received),
      //       },
      //     }
      //   );
      // } else if (item.fleetId && item.fleetId !== '') {
      //   await InventoryFleet.updateOne(
      //     { _id: item.fleetId },
      //     {
      //       $inc: {
      //         inWarehouseQuantity: -Number(item.received),
      //         quantityToBeReceived: Number(item.received),
      //         quantityToBeBilled: -Number(item.received),
      //       },
      //     }
      //   );
      // }
    }

    await Account.findOneAndUpdate(
      {
        accountName: 'Inventory Asset',
        organization: updatedPurchaseReceived.organization,
      },
      { $inc: { amount: -Number(totalInventory) } }
    );

    await Transaction.deleteMany({
      id: updatedPurchaseReceived.id,
      type: 'purchase receive',
      organization: updatedPurchaseReceived.organization,
    });
  }

  await createActivityLog({
    userId: req.id,
    action: 'reject',
    type: 'purchasereceive',
    actionId: updatedPurchaseReceived.id,
    organization: updatedPurchaseReceived.organization,
    company: updatedPurchaseReceived.company,
  });

  res.status(201).json({
    success: true,
    message: 'Purchase Received rejected successfully',
    data: updatedPurchaseReceived,
  });
});

const updatePurchaseReceiveApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;
  const purchaseReceived = await PurchaseReceived.findById(id);
  if (!purchaseReceived) {
    throw new NotFoundError('Purchase Received not found');
  }

  const resetFields = () => {
    purchaseReceived.verifiedBy = null;
    purchaseReceived.approvedBy1 = null;
    purchaseReceived.approvedBy2 = null;
    purchaseReceived.verifiedAt = null;
    purchaseReceived.approvedAt1 = null;
    purchaseReceived.approvedAt2 = null;
    purchaseReceived.reviewedBy = null;
    purchaseReceived.reviewedAt = null;
    purchaseReceived.acknowledgedBy = null;
    purchaseReceived.acknowledgedAt = null;
  };

  purchaseReceived.approval = approval;
  switch (approval) {
    case 'reviewed':
      purchaseReceived.reviewedBy = req.id || null;
      purchaseReceived.reviewedAt = new Date();
      purchaseReceived.verifiedBy = null;
      purchaseReceived.verifiedAt = null;
      purchaseReceived.acknowledgedBy = null;
      purchaseReceived.acknowledgedAt = null;
      break;
    case 'verified':
      purchaseReceived.verifiedBy = req.id || null;
      purchaseReceived.verifiedAt = new Date();
      purchaseReceived.acknowledgedBy = null;
      purchaseReceived.acknowledgedAt = null;
      break;
    case 'acknowledged':
      purchaseReceived.acknowledgedBy = req.id || null;
      purchaseReceived.acknowledgedAt = new Date();
      break;
    case 'correction':
      purchaseReceived.approvalComment = approvalComment || null;
      resetFields();
      break;
    default:
      break;
  }
  const updatedPurchaseReceived = await purchaseReceived.save();

  await findNextApprovalLevelAndNotify(
    'purchasereceives',
    approval,
    updatedPurchaseReceived.organization,
    updatedPurchaseReceived.company,
    updatedPurchaseReceived.id,
    'Purchase Received',
    'purchaseReceive',
    updatedPurchaseReceived._id
  );

  await createActivityLog({
    userId: req.id,
    action: approval,
    type: 'purchasereceive',
    actionId: updatedPurchaseReceived.id,
    organization: updatedPurchaseReceived.organization,
    company: updatedPurchaseReceived.company,
  });

  res.status(201).json({
    success: true,
    message: 'Purchase Received approved successfully',
    data: updatedPurchaseReceived,
  });
});

const invalidatePurchaseReceive = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const purchasereceive = await PurchaseReceived.findByIdAndUpdate(id, {
    $set: {
      valid: false,
      verifiedBy: null,
      verifiedAt: null,
      approvedBy1: null,
      approvedAt1: null,
      approvedBy2: null,
      approvedAt2: null,
      reviewedBy: null,
      reviewedAt: null,
      acknowledgedBy: null,
      acknowledgedAt: null,
    },
  });

  const hasApproval = await ifHasApproval(
    'purchasereceives',
    purchasereceive.organization
  );

  if (
    purchasereceive.approval === 'approved1' ||
    purchasereceive.approval === 'approved2' ||
    purchasereceive.approval === 'none'
  ) {
    await PurchaseOrder.findOneAndUpdate(
      { _id: purchasereceive?.purchaseOrder },
      {
        $set: {
          status: 'pending',
        },
      }
    );

    let totalInventory = 0;
    // const items1 = purchaseorder?.items;
    for (let i = 0; i < purchasereceive?.items?.length; i++) {
      const item = purchasereceive?.items[i];
      totalInventory += Number(item.amount || 0) - Number(item.inTransit || 0);
      // if (item.itemId && item.itemId !== '') {
      //   await Product.updateOne(
      //     { _id: item.itemId },
      //     {
      //       $inc: {
      //         inWarehouseQuantity: -Number(item.received),
      //         quantityToBeReceived: Number(item.received),
      //         quantityToBeBilled: -Number(item.received),
      //       },
      //     }
      //   );
      // } else if (item.fleetId && item.fleetId !== '') {
      //   await InventoryFleet.updateOne(
      //     { _id: item.fleetId },
      //     {
      //       $inc: {
      //         inWarehouseQuantity: -Number(item.received),
      //         quantityToBeReceived: Number(item.received),
      //         quantityToBeBilled: -Number(item.received),
      //       },
      //     }
      //   );
      // }
    }

    await Account.findOneAndUpdate(
      {
        accountName: 'Inventory Asset',
        organization: purchasereceive.organization,
      },
      {
        $inc: {
          amount: -Number(totalInventory),
        },
      }
    );

    await Transaction.deleteMany({
      id: purchasereceive?.id,
      type: 'purchase receive',
      organization: purchasereceive.organization,
    });
  }

  purchasereceive.approval = hasApproval ? 'rejected' : 'none';
  await purchasereceive.save();

  if (!hasApproval) {
    await approvePurchaseReceived(purchasereceive);
  }

  await createActivityLog({
    userId: req.id,
    action: 'invalidate',
    type: 'purchasereceive',
    actionId: purchasereceive.id,
    organization: purchasereceive.organization,
    company: purchasereceive.company,
  });

  res.status(201).json({
    success: true,
    message: 'Purchase Received invalidated successfully',
    data: purchasereceive,
  });
});

//filter
const getFilteredPurchaseReceives = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    filter_validity,
    filter_status,
    filter_approval,
    filter_vendor,
    filter_vendorName,
    search_query = '',
    startDate,
    endDate,
    page = 1,
    limit = 25,
    sort_by = 'receivedDate',
    sort_order = 'desc',
  } = req.query;

  const dateFilter = {};
  if (startDate !== 'undefined' && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate !== 'undefined' && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    organization: orgid,
  };
  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_status) {
    query.status = filter_status;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (filter_vendor) {
    query.vendor = filter_vendor;
  }
  if (filter_vendorName) {
    const vendorIds = await Vendor.find({
      displayName: { $regex: filter_vendorName, $options: 'i' },
    }).distinct('_id');

    if (vendorIds.length > 0) {
      query.vendor = { $in: vendorIds };
    } else {
      query.vendor = null;
    }
  }
  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }
  if (
    startDate &&
    startDate !== 'undefined' &&
    startDate !== 'null' &&
    endDate &&
    endDate !== 'undefined' &&
    endDate !== 'null'
  ) {
    query.receivedDate = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'vendor', select: 'displayName currency' },
      { path: 'purchaseOrder', select: 'id' },
      { path: 'store', select: 'name' },
    ],
  };

  const result = await PurchaseReceived.paginate(query, options);
  res.status(200).json({
    data: {
      purchaseReceiveds: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalPurchaseReceiveds: result.totalDocs,
    },
    success: true,
    message: 'Purchase Received filtered successfully',
  });
});

const getFilteredPurchaseReceivesWithoutPagination = asyncHandler(
  async (req, res) => {
    const { orgid } = req.params;
    const {
      filter_validity,
      filter_status,
      filter_approval,
      filter_vendor,
      filter_vendorName,
      search_query = '',
      startDate,
      endDate,
      sort_by = 'receivedDate',
      sort_order = 'desc',
    } = req.query;

    const dateFilter = {};
    if (startDate !== 'undefined' && startDate !== 'null') {
      dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
    }
    if (endDate !== 'undefined' && endDate !== 'null') {
      dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const query = {
      organization: orgid,
    };
    if (filter_validity) {
      query.valid = filter_validity;
    }
    if (filter_status) {
      query.status = filter_status;
    }
    if (filter_approval) {
      query.approval = filter_approval;
    }
    if (filter_vendor) {
      query.vendor = filter_vendor;
    }
    if (filter_vendorName) {
      const vendorIds = await Vendor.find({
        displayName: { $regex: filter_vendorName, $options: 'i' },
      }).distinct('_id');

      if (vendorIds.length > 0) {
        query.vendor = { $in: vendorIds };
      } else {
        query.vendor = null;
      }
    }
    if (search_query) {
      query.id = { $regex: search_query, $options: 'i' };
    }
    if (
      startDate &&
      startDate !== 'undefined' &&
      startDate !== 'null' &&
      endDate &&
      endDate !== 'undefined' &&
      endDate !== 'null'
    ) {
      query.receivedDate = dateFilter;
    }

    const purchaseReceiveds = await PurchaseReceived.find(query)
      .select('receivedDate id vendor approval valid approval status createdAt')
      .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 })
      .populate({ path: 'vendor', select: 'displayName currency' })
      .populate({ path: 'purchaseOrder', select: 'id' })
      .populate({ path: 'store', select: 'name' });

    res.status(200).json({
      success: true,
      message: 'Purchase Received filtered successfully',
      data: {
        purchaseReceiveds,
        totalPurchaseReceiveds: purchaseReceiveds.length,
      },
    });
  }
);

const getFilteredPurchaseReceivesByAgent = asyncHandler(async (req, res) => {
  const {
    filter_validity,
    filter_status,
    filter_approval,
    filter_vendor,
    filter_vendorName,
    search_query = '',
    startDate,
    endDate,
    page = 1,
    limit = 25,
    sort_by = 'receivedDate',
    sort_order = 'desc',
  } = req.query;

  const dateFilter = {};
  if (startDate !== 'undefined' && startDate !== 'null') {
    dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  }
  if (endDate !== 'undefined' && endDate !== 'null') {
    dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const query = {
    user: req.id,
  };
  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (filter_status) {
    query.status = filter_status;
  }
  if (filter_vendor) {
    query.vendor = filter_vendor;
  }
  if (filter_vendorName) {
    const vendorIds = await Vendor.find({
      displayName: { $regex: filter_vendorName, $options: 'i' },
    }).distinct('_id');

    if (vendorIds.length > 0) {
      query.vendor = { $in: vendorIds };
    } else {
      query.vendor = null;
    }
  }
  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }
  if (
    startDate &&
    startDate !== 'undefined' &&
    startDate !== 'null' &&
    endDate &&
    endDate !== 'undefined' &&
    endDate !== 'null'
  ) {
    query.receivedDate = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'vendor', select: 'displayName currency' },
      { path: 'purchaseOrder', select: 'id' },
      { path: 'store', select: 'name' },
    ],
  };

  const result = await PurchaseReceived.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Purchase Received filtered successfully',
    data: {
      purchaseReceiveds: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalPurchaseReceiveds: result.totalDocs,
    },
  });
});

const deletePurchaseReceived = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const purchaseReceived = await PurchaseReceived.findByIdAndDelete(id);
  res.status(200).json({
    success: true,
    message: 'Purchase Received deleted successfully',
    data: purchaseReceived,
  });
});

const getPurchaseReceivedById = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { chanageId } = req.query;

  const purchaseReceive = await PurchaseReceived.findOne({
    organization: orgid,
    id: chanageId,
  });

  if (purchaseReceive) {
    return res.status(400).json({ data: { error: 'This ID already exists' } });
  }

  return res.json({ success: true, data: { message: 'ID is available' } });
});

module.exports = {
  createPartialPurchaseReceive,
  createPurchaseReceive,
  updatePurchaseReceive,
  revisedPurchaseReceived,
  getPurchaseReceivedByAgent,
  getPurchaseReceivesByOrganization,
  getPurchaseReceiveLength,
  getPurchaseReceiveById,
  getPurchaseReceiveByPurchaseOrder,
  getPurchaseReceiveByVendorId,
  approvePurchaseReceive,
  rejectPurchaseReceive,
  updatePurchaseReceiveApproval,
  invalidatePurchaseReceive,
  getFilteredPurchaseReceives,
  getFilteredPurchaseReceivesWithoutPagination,
  getFilteredPurchaseReceivesByAgent,
  deletePurchaseReceived,
  getPurchaseReceivedById,
};
