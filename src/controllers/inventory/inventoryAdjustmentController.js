const InventoryAdjustment = require('../../models/inventory/InventoryAdjustment');
const Organization = require('../../models/auth/Organization');
const Product = require('../../models/inventory/Product');
const Account = require('../../models/accounts/Account');
const Transaction = require('../../models/accounts/Transaction');
// const { createActivityLog } = require("../../utilities/logUtils");
const { asyncHandler } = require('../../middleware/errorHandler');

const createAdjustment = asyncHandler(async (req, res) => {
  const {
    reason,
    description,
    items,
    account,
    mode,
    referenceNo,
    date,
    createdBy,
    company,
    status,
    organization,
  } = req.body;
  const inventoryAdjustment = new InventoryAdjustment({
    reason,
    description,
    items,
    account,
    mode,
    referenceNo,
    date,
    createdBy,
    status,
    company,
    organization,
  });
  const savedInventoryAdjustment = await inventoryAdjustment.save();
  let totalAdjusted = 0;

  await items?.forEach(async (item) => {
    totalAdjusted +=
      mode === 'quantity'
        ? Number(item.adjustedValue) * Number(item.value)
        : Number(item.adjustedValue);
    const productUpdate = await Product.findOne({ _id: item.itemId });
    if (mode === 'quantity') {
      productUpdate.quantity = item.newQuantity;
    } else {
      productUpdate.price = Number(item.newValue) / Number(item.quantity);
    }
    await productUpdate.save();

    const inventoryAccount = await Account.findOne({
      _id: productUpdate.inventoryAccount,
    });
    if (inventoryAccount) {
      if (mode === 'quantity') {
        inventoryAccount.amount =
          inventoryAccount.amount +
          Number(item.adjustedValue) * Number(item.value);
      } else {
        inventoryAccount.amount =
          inventoryAccount.amount + Number(item.adjustedValue);
      }
      await inventoryAccount.save();
      const transaction = new Transaction({
        reference: inventoryAdjustment.referenceNo,
        product: item.itemId,
        account: inventoryAccount?._id || null,
        type: 'inventory adjustment',
        debit:
          item.adjustedValue > 0
            ? mode === 'quantity'
              ? Number(item.adjustedValue) * Number(item.value)
              : Number(item.adjustedValue)
            : 0,
        credit:
          item.adjustedValue < 0
            ? mode === 'quantity'
              ? Math.abs(Number(item.adjustedValue) * Number(item.value))
              : Math.abs(item.adjustedValue)
            : 0,
        runningBalance: inventoryAccount?.amount,
        organization: inventoryAdjustment.organization,
        company: inventoryAdjustment.company,
      });
      await transaction.save();
    }
  });

  const accountUpdate = await Account.findOne({ _id: account });
  if (accountUpdate) {
    accountUpdate.amount = accountUpdate.amount + totalAdjusted;
    await accountUpdate.save();
    const debitValue = totalAdjusted > 0 ? totalAdjusted : 0;
    const creditValue = totalAdjusted < 0 ? Math.abs(totalAdjusted) : 0;
    const transaction = new Transaction({
      reference: inventoryAdjustment.referenceNo,
      account: accountUpdate?._id || null,
      type: 'inventory adjustment',
      debit:
        accountUpdate.accountType === 'expense' ||
        accountUpdate.accountType === 'costofgoodssold' ||
        accountUpdate.accountType === 'fixedasset' ||
        accountUpdate.accountType === 'currentasset' ||
        accountUpdate.accountType === 'othercurrentasset' ||
        accountUpdate.accountType === 'cashandbank'
          ? debitValue
          : 0,
      credit:
        accountUpdate.accountType === 'income' ||
        accountUpdate.accountType === 'ownersequity' ||
        accountUpdate.accountType === 'currentliability'
          ? creditValue
          : 0,
      runningBalance: accountUpdate?.amount,
      organization: inventoryAdjustment.organization,
      company: inventoryAdjustment.company,
    });
    await transaction.save();
  }

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'create',
  //     actionId: new Date(savedInventoryAdjustment.createdAt).toLocaleDateString(),
  //     type: 'inventoryAdjustment',
  //     organization: savedInventoryAdjustment.organization,
  //     company: savedInventoryAdjustment.company,
  //   });

  //   await createActivityLog({
  //     userId: req._id,
  //     action: 'approve',
  //     actionId: new Date(savedInventoryAdjustment.createdAt).toLocaleDateString(),
  //     type: 'inventoryAdjustment',
  //     organization: savedInventoryAdjustment.organization,
  //     company: savedInventoryAdjustment.company,
  //   });

  res.status(201).json({
    success: true,
    message: 'Adjust created successfully',
    data: savedInventoryAdjustment,
  });
});

const createDraft = asyncHandler(async (req, res) => {
  const {
    reason,
    description,
    items,
    account,
    mode,
    referenceNo,
    date,
    createdBy,
    company,
    status,
    organization,
  } = req.body;
  const inventoryAdjustment = new InventoryAdjustment({
    reason,
    description,
    items,
    account,
    mode,
    referenceNo,
    date,
    createdBy,
    status,
    company,
    organization,
  });
  const savedInventoryAdjustment = await inventoryAdjustment.save();

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'create',
  //   actionId: new Date(
  //     savedInventoryAdjustment.createdAt
  //   ).toLocaleDateString(),
  //   type: 'inventoryAdjustment',
  //   organization: savedInventoryAdjustment.organization,
  //   company: savedInventoryAdjustment.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Adjust created successfully',
    data: savedInventoryAdjustment,
  });
});

const approveAdjustment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventoryAdjustment = await InventoryAdjustment.findByIdAndUpdate(
    id,
    {
      status: 'adjusted',
    },
    { new: true }
  );
  if (!inventoryAdjustment) {
    throw new Error('Inventory Adjustment not found');
  }
  let totalAdjusted = 0;
  await inventoryAdjustment.items?.forEach(async (item) => {
    totalAdjusted +=
      inventoryAdjustment.mode === 'quantity'
        ? Number(item.adjustedValue) * Number(item.value)
        : Number(item.adjustedValue);
    const productUpdate = await Product.findOne({ _id: item.itemId });
    if (inventoryAdjustment.mode === 'quantity') {
      productUpdate.quantity = item.newQuantity;
    } else {
      productUpdate.price = Number(item.newValue) / Number(item.quantity);
    }
    await productUpdate.save();

    const inventoryAccount = await Account.findOne({
      _id: productUpdate.inventoryAccount,
    });
    if (inventoryAccount) {
      if (inventoryAdjustment.mode === 'quantity') {
        inventoryAccount.amount =
          inventoryAccount.amount +
          Number(item.adjustedValue) * Number(item.value);
      } else {
        inventoryAccount.amount =
          inventoryAccount.amount + Number(item.adjustedValue);
      }
      await inventoryAccount.save();
      const transaction = new Transaction({
        reference: inventoryAdjustment.referenceNo,
        product: item.itemId,
        account: inventoryAccount?._id || null,
        type: 'inventory adjustment',
        debit:
          item.adjustedValue > 0
            ? inventoryAdjustment.mode === 'quantity'
              ? Number(item.adjustedValue) * Number(item.value)
              : Number(item.adjustedValue)
            : 0,
        credit:
          item.adjustedValue < 0
            ? inventoryAdjustment.mode === 'quantity'
              ? Math.abs(Number(item.adjustedValue) * Number(item.value))
              : Math.abs(item.adjustedValue)
            : 0,
        runningBalance: inventoryAccount?.amount,
        organization: inventoryAdjustment.organization,
        company: inventoryAdjustment.company,
      });
      await transaction.save();
    }
  });

  const accountUpdate = await Account.findOne({
    _id: inventoryAdjustment.account,
  });
  if (accountUpdate) {
    accountUpdate.amount = accountUpdate.amount + totalAdjusted;
    await accountUpdate.save();
    const debitValue = totalAdjusted > 0 ? totalAdjusted : 0;
    const creditValue = totalAdjusted < 0 ? Math.abs(totalAdjusted) : 0;
    const transaction = new Transaction({
      reference: inventoryAdjustment.referenceNo,
      account: accountUpdate?._id || null,
      type: 'inventory adjustment',
      debit:
        accountUpdate.accountType === 'expense' ||
        accountUpdate.accountType === 'costofgoodssold' ||
        accountUpdate.accountType === 'fixedasset' ||
        accountUpdate.accountType === 'currentasset' ||
        accountUpdate.accountType === 'othercurrentasset' ||
        accountUpdate.accountType === 'cashandbank'
          ? debitValue
          : 0,
      credit:
        accountUpdate.accountType === 'income' ||
        accountUpdate.accountType === 'ownersequity' ||
        accountUpdate.accountType === 'currentliability'
          ? creditValue
          : 0,
      runningBalance: accountUpdate?.amount,
      organization: inventoryAdjustment.organization,
      company: inventoryAdjustment.company,
    });
    await transaction.save();
  }

  // await createActivityLog({
  //   userId: req._id,
  //   action: 'approve',
  //   actionId: new Date(inventoryAdjustment.createdAt).toLocaleDateString(),
  //   type: 'inventoryAdjustment',
  //   organization: inventoryAdjustment.organization,
  //   company: inventoryAdjustment.company,
  // });

  res.status(201).json({
    success: true,
    message: 'Inventory adjustment approved successfully',
    data: inventoryAdjustment,
  });
});

const getInventoryAdjustments = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const inventoryAdjustments = await InventoryAdjustment.find({
    organization: orgId,
  })
    .populate('createdBy')
    .sort({ createdAt: -1 });
  res.status(201).json({
    success: true,
    message: 'Inventory adjustments retrieved successfully',
    data: inventoryAdjustments,
  });
});

const getInventoryAdjustment = asyncHandler(async (req, res) => {
  const inventoryAdjustment = await InventoryAdjustment.findById(req.params.id)
    .populate('createdBy')
    .populate('items.itemId');
  res.status(201).json({
    success: true,
    message: 'Inventory adjustment retrieved successfully',
    data: inventoryAdjustment,
  });
});

const addReason = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  console.log(orgId , req.body.reason);
  const organization = await Organization.findByIdAndUpdate(
    orgId,
    {
      $push: { reasons: req.body.reason },
    },
    { new: true }
  );

  if (!organization) {
    throw new Error('Organization not found');
  }
  res.status(201).json({
    success: true,
    message: 'Reason added successfully',
    data: organization,
  });
});

const getReasons = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.params.id).select('reasons');
  
  if (!org) {
    throw new Error('Organization not found');
  }
  
  res.status(200).json({
    success: true,
    message: 'Reasons retrieved successfully',
    data: org.reasons || [],
  });
});

module.exports = {
  createAdjustment,
  createDraft,
  approveAdjustment,
  getInventoryAdjustments,
  getInventoryAdjustment,
  addReason,
  getReasons,
};
