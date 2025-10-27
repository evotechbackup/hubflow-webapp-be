const LastInsertedId = require('../../models/master/LastInsertedID');
const Bills = require('../../models/procurement/Bills');
const PurchaseReceived = require('../../models/procurement/PurchaseReceive');
const PurchaseOrder = require('../../models/procurement/PurchaseOrder');
// const Product = require("../../models/Product");
const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
// const TaskNotification = require("../../models/TaskNotification");
// const {
//   subscribeToTopicByAgentId,
//   sendNewBillEmailNotification,
// } = require("../../controller/Notifier");
const Vendor = require('../../models/procurement/Vendor');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../utils/approvalUtils');
const { createActivityLog } = require('../../utils/logUtils');
const CostCenter = require('../../models/accounts/CostCenter');
const ParentAccount = require('../../models/accounts/ParentAccount');
const Organization = require('../../models/auth/Organization');
// const InventoryFleet = require('../../models/fleets/InventoryFleet');
const { asyncHandler } = require('../../middleware');
const { NotFoundError } = require('../../utils/errors');

const approveBill = async (bill) => {
  // await bill.items.forEach(async (item) => {
  //   if (item.itemId && item.itemId !== '') {
  //     const product = await Product.findOne({ _id: item.itemId });
  //     if (product) {
  //       if (product?.inventoryAccount) {
  //         const updateInventoryAccount = await Account.findOne({
  //           _id: product?.inventoryAccount,
  //         });
  //         if (updateInventoryAccount) {
  //           updateInventoryAccount.amount += Number(item.price * item.quantity);
  //           await updateInventoryAccount.save();
  //           const transaction2 = new Transaction({
  //             product: item.itemId,
  //             project: orderManagement?.project || null,
  //             type: 'bill',
  //             id: product?.productName,
  //             reference: bill.id,
  //             account: product?.inventoryAccount || null,
  //             vendor: bill.vendor,
  //             debit: item.price * item.quantity - item.discount,
  //             runningBalance: updateInventoryAccount?.amount,
  //             organization: bill.organization,
  //             company: bill.company,
  //           });
  //           await transaction2.save();
  //         }
  //       }
  //       //    product.inWarehouseQuantity += item.quantity;
  //       product.quantityToBeBilled -= item.quantity;
  //       //    product.quantityToBeReceived -= item.quantity;
  //       await product.save();
  //     }
  //   } else if (item.fleetId && item.fleetId !== '') {
  //     const fleet = await InventoryFleet.findOne({ _id: item.fleetId });
  //     if (fleet) {
  //       if (fleet?.inventoryAccount) {
  //         const updateInventoryAccount = await Account.findOne({
  //           _id: fleet?.inventoryAccount,
  //         });
  //         if (updateInventoryAccount) {
  //           updateInventoryAccount.amount += Number(item.price * item.quantity);
  //           await updateInventoryAccount.save();
  //           const transaction2 = new Transaction({
  //             project: orderManagement?.project || null,
  //             type: 'bill',
  //             id: fleet?.productName,
  //             reference: bill.id,
  //             account: fleet?.inventoryAccount || null,
  //             vendor: bill.vendor,
  //             debit: item.price * item.quantity - item.discount,
  //             runningBalance: updateInventoryAccount?.amount,
  //             organization: bill.organization,
  //             company: bill.company,
  //           });
  //           await transaction2.save();
  //         }
  //       }
  //       //    product.inWarehouseQuantity += item.quantity;
  //       fleet.quantityToBeBilled -= item.quantity;
  //       //    product.quantityToBeReceived -= item.quantity;
  //       await fleet.save();
  //     }
  //   }
  // });

  const vendor = await Vendor.findById(bill.vendor).select('displayName');

  let accountsPayable = await Account.findOne({
    accountName: vendor.displayName,
    organization: bill.organization,
  });

  if (!accountsPayable) {
    const parentAccount = await ParentAccount.findOne({
      accountName: 'Accounts Payable',
      organization: bill.organization,
    });

    const newAccount = new Account({
      accountName: vendor.displayName,
      accountType: 'currentliability',
      accountCode: `AC-CL-AP-${parentAccount?.childAccounts?.length + 1}`,
      currency: 'AED',
      description: '',
      parentAccount: parentAccount._id,
      organization: bill.organization,
      company: bill.company,
    });
    accountsPayable = await newAccount.save();

    parentAccount.childAccounts.push(newAccount._id);
    await parentAccount.save();
  }

  accountsPayable.amount += Number(bill.total);
  await accountsPayable.save();

  const transaction1 = new Transaction({
    account: accountsPayable._id,
    vendor: bill.vendor,
    reference: bill.id,
    id: vendor?.displayName || '',
    credit: Number(bill.total),
    type: 'bill',
    runningBalance: accountsPayable?.amount,
    organization: bill.organization,
    company: bill.company,
  });
  await transaction1.save();

  const organization = await Organization.findById(bill.organization).select(
    'isAccrualAccounting'
  );

  if (organization.isAccrualAccounting) {
    const expenseAccount = await Account.findByIdAndUpdate(
      bill.expenseAccount,
      {
        $inc: {
          amount: Number(bill.total),
        },
      },
      {
        new: true,
      }
    );

    if (expenseAccount) {
      const transaction2 = new Transaction({
        account: expenseAccount._id,
        vendor: bill.vendor,
        reference: bill.id,
        id: vendor?.displayName || '',
        debit: Number(bill.total),
        type: 'bill',
        runningBalance: expenseAccount?.amount,
        organization: bill.organization,
        company: bill.company,
      });
      await transaction2.save();
    }
  }

  if (bill.costCenter && bill.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      bill.costCenter,
      {
        $push: {
          expense: {
            purchaseId: bill.id,
            amount: Number(bill.total),
            date: bill.billDate,
          },
        },
        $inc: {
          totalExpense: Number(bill.total),
        },
      },
      { new: true }
    );
  }
};

const createPartialBill = asyncHandler(async (req, res) => {
  const {
    vendor,
    orderNo,
    poNo,
    items,
    billDate,
    dueDate,
    subject,
    paymentTerms,
    notes,
    termsCondition,
    total,
    subtotal,
    tax,
    company,
    docAttached,
    organization,
    currentId,
    totalBalance,
    paymentPercentage,
    paymentAmount,
    totalBalancePaid,
    costCenter,
    expenseAccount,
  } = req.body;

  const partialId = currentId.split('-P-');
  const newId =
    totalBalance === 0
      ? partialId[0]
      : `${partialId[0]}-P-${Number(partialId[1]) + 1}`;

  const hasApproval = await ifHasApproval('paymentrequest', organization);

  const newBills = new Bills({
    id: newId,
    vendor,
    orderNo,
    poNo,
    items,
    billDate,
    dueDate,
    subject,
    paymentTerms,
    notes,
    termsCondition,
    total,
    subtotal,
    tax,
    company,
    organization,
    user: req.id,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
    partialStatus: totalBalance === 0 ? 'full' : 'partial',
    paymentPercentage,
    paymentAmount,
    totalBalance,
    totalBalancePaid,
    costCenter,
    expenseAccount,
  });
  const savedBills = await newBills.save();
  await PurchaseReceived.updateMany(
    { _id: { $in: orderNo } },
    { $set: { status: 'billed' } }
  );

  // const agentIds = await User.find({
  //   organization,
  //   hierarchy: 1,
  // }).select('email _id');

  // const notificationPromises = [
  //   TaskNotification.insertMany(
  //     agentIds.map((id) => ({
  //       type: 'bills',
  //       receiver: id._id,
  //       bill: savedBills._id,
  //       date: new Date(),
  //     }))
  //   ),
  //   ...agentIds.map(({ _id, email }) => {
  //     subscribeToTopicByAgentId(_id, 'bills', savedBills._id);
  //     sendNewBillEmailNotification(email, savedBills);
  //   }),
  // ];

  // await Promise.all(notificationPromises);

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'bills',
    actionId: savedBills._id,
    organization: savedBills.organization,
    company: savedBills.company,
  });

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'paymentrequest',
      'pending',
      savedBills.organization,
      savedBills.company,
      savedBills.id,
      'Bill',
      'billsList',
      savedBills._id
    );
  } else {
    await approveBill(savedBills);
  }

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendors.findById(savedBills.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Bill created successfully',
    data: savedBills,
  });
});

const createBill = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'bills',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({ entity: 'bills', organization });
  }
  if (id !== undefined && !isNaN(parseInt(id))) {
    lastInsertedId.lastId = parseInt(id);
    await lastInsertedId.save();
  } else {
    lastInsertedId.lastId += 1;
    await lastInsertedId.save();
  }
  const { prefix } = req.body;
  const billsPrefix = prefix || lastInsertedId.prefix || '';
  if (prefix) {
    lastInsertedId.prefix = prefix;
    await lastInsertedId.save();
  }
  const {
    vendor,
    orderNo,
    poNo,
    items,
    billDate,
    dueDate,
    subject,
    paymentTerms,
    notes,
    termsCondition,
    total,
    subtotal,
    tax,
    company,
    docAttached,
    paymentPercentage,
    paymentAmount,
    totalBalance,
    costCenter,
    expenseAccount,
  } = req.body;

  const partialId = await Bills.find({
    $or: [{ orderNo }, { poNo }],
    partialStatus: 'partial',
  }).countDocuments();

  let paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  if (partialId === 0) {
    paddedId += totalBalance === 0 ? '' : '-P-1';
  } else {
    paddedId += totalBalance === 0 ? '' : `-P-${partialId + 1}`;
  }

  const hasApproval = await ifHasApproval('paymentrequest', organization);

  const newBills = new Bills({
    id: customID ? customID : billsPrefix + paddedId,
    vendor,
    orderNo,
    poNo,
    items,
    billDate,
    dueDate,
    subject,
    paymentTerms,
    notes,
    termsCondition,
    total,
    subtotal,
    tax,
    company,
    organization,
    user: req.id,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
    partialStatus: totalBalance === 0 ? 'full' : 'partial',
    paymentPercentage,
    paymentAmount,
    totalBalance,
    totalBalancePaid: total - totalBalance,
    costCenter,
    expenseAccount,
  });
  const savedBills = await newBills.save();
  await PurchaseReceived.updateMany(
    { _id: { $in: orderNo } },
    { $set: { status: 'billed' } }
  );

  // const agentIds = await Agent.find({
  //   organization,
  //   hierarchy: 1,
  // }).select('email _id');

  // const notificationPromises = [
  //   TaskNotification.insertMany(
  //     agentIds.map((id) => ({
  //       type: 'bills',
  //       receiver: id._id,
  //       bill: savedBills._id,
  //       date: new Date(),
  //     }))
  //   ),
  //   ...agentIds.map(({ _id, email }) => {
  //     subscribeToTopicByAgentId(_id, 'bills', savedBills._id);
  //     sendNewBillEmailNotification(email, savedBills);
  //   }),
  // ];

  // await Promise.all(notificationPromises);

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'bills',
    actionId: savedBills._id,
    organization: savedBills.organization,
    company: savedBills.company,
  });

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'paymentrequest',
      'pending',
      savedBills.organization,
      savedBills.company,
      savedBills.id,
      'Bill',
      'billsList',
      savedBills._id
    );
  } else {
    await approveBill(savedBills);
  }

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(savedBills.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Bill created successfully',
    data: savedBills,
  });
});

const updateBill = asyncHandler(async (req, res) => {
  const { billId } = req.params;
  const {
    id,
    vendor,
    orderNo,
    items,
    billDate,
    dueDate,
    subject,
    paymentTerms,
    notes,
    termsCondition,
    total,
    subtotal,
    tax,
    docAttached,
    paymentPercentage,
    paymentAmount,
    totalBalance,
    costCenter,
    expenseAccount,
  } = req.body;

  // Find the existing bill
  const existingBill = await Bills.findById(billId);

  if (!existingBill) {
    throw new NotFoundError('Bill not found');
  }

  if (
    existingBill.approval === 'approved1' ||
    existingBill.approval === 'approved2' ||
    existingBill.approval === 'none'
  ) {
    // for (const item of existingBill.items) {
    //   if (item.itemId && item.itemId !== '') {
    //     const product = await Product.findOne({ _id: item.itemId });
    //     if (product && product.inventoryAccount) {
    //       const updateInventoryAccount = await Account.findOne({
    //         _id: product.inventoryAccount,
    //         organization,
    //       });
    //       if (updateInventoryAccount) {
    //         updateInventoryAccount.amount -= Number(
    //           item.price * item.quantity
    //         );
    //         await updateInventoryAccount.save();
    //       }

    //       // Update product quantities
    //       product.quantityToBeBilled += item.quantity;
    //       await product.save();
    //     }
    //   } else if (item.fleetId && item.fleetId !== '') {
    //     const fleet = await InventoryFleet.findOne({ _id: item.fleetId });
    //     if (fleet && fleet.inventoryAccount) {
    //       const updateInventoryAccount = await Account.findOne({
    //         _id: fleet.inventoryAccount,
    //         organization,
    //       });
    //       if (updateInventoryAccount) {
    //         updateInventoryAccount.amount -= Number(
    //           item.price * item.quantity
    //         );
    //         await updateInventoryAccount.save();
    //       }

    //       // Update fleet quantities
    //       fleet.quantityToBeBilled += item.quantity;
    //       await fleet.save();
    //     }
    //   }
    // }

    const vendor = await Vendor.findById(existingBill.vendor).select(
      'displayName'
    );

    const accountsPayable = await Account.findOne({
      accountName: vendor.displayName,
      organization: existingBill.organization,
    });

    if (accountsPayable) {
      accountsPayable.amount -= Number(existingBill.total);
      await accountsPayable.save();
    }

    const organization = await Organization.findById(
      existingBill.organization
    ).select('isAccrualAccounting');

    if (organization.isAccrualAccounting) {
      await Account.findByIdAndUpdate(existingBill.expenseAccount, {
        $inc: {
          amount: -Number(existingBill.total),
        },
      });
    }

    await Transaction.deleteMany({
      type: 'bill',
      id: existingBill.id,
      organization: existingBill.organization,
    });

    if (existingBill.costCenter && existingBill.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        existingBill.costCenter,
        {
          $push: {
            expense: {
              purchaseId: existingBill.id,
              amount: Number(existingBill.total),
              date: existingBill.billDate,
            },
          },
          $inc: {
            totalExpense: -Number(existingBill.total),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'paymentrequest',
    existingBill.organization
  );

  // Update bill fields
  existingBill.vendor = vendor;
  existingBill.id = id;
  existingBill.orderNo = orderNo;
  existingBill.items = items;
  existingBill.billDate = billDate;
  existingBill.dueDate = dueDate;
  existingBill.subject = subject;
  existingBill.paymentTerms = paymentTerms;
  existingBill.notes = notes;
  existingBill.termsCondition = termsCondition;
  existingBill.total = total;
  existingBill.subtotal = subtotal;
  existingBill.tax = tax;
  existingBill.user = req.id;
  existingBill.approval = hasApproval ? 'pending' : 'none';
  existingBill.verifiedBy = null;
  existingBill.verifiedAt = null;
  existingBill.reviewedBy = null;
  existingBill.reviewedAt = null;
  existingBill.approvedBy1 = null;
  existingBill.approvedAt1 = null;
  existingBill.approvedBy2 = null;
  existingBill.approvedAt2 = null;
  existingBill.acknowledgedBy = null;
  existingBill.acknowledgedAt = null;
  existingBill.docAttached = docAttached;
  existingBill.partialStatus = totalBalance === 0 ? 'full' : 'partial';
  existingBill.paymentPercentage = paymentPercentage;
  existingBill.paymentAmount = paymentAmount;
  existingBill.totalBalance = totalBalance;
  existingBill.costCenter = costCenter;
  existingBill.expenseAccount = expenseAccount;
  // Save updated bill
  const updatedBill = await existingBill.save();

  // Update related PurchaseReceived documents
  await PurchaseReceived.updateMany(
    { _id: { $in: orderNo } },
    { $set: { status: 'billed' } }
  );

  if (!hasApproval) {
    await approveBill(existingBill);
  }

  // Update notifications
  // await TaskNotification.updateMany(
  //   { bill: existingBill._id },
  //   { $set: { date: new Date() } }
  // );

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'bills',
    actionId: updatedBill.id,
    organization: updatedBill.organization,
    company: updatedBill.company,
  });

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(updatedBill.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(200).json({
    success: true,
    message: 'Bill updated successfully',
    data: updatedBill,
  });
});

const revisedBill = asyncHandler(async (req, res) => {
  const { billId } = req.params;
  const {
    vendor,
    orderNo,
    items,
    billDate,
    dueDate,
    subject,
    paymentTerms,
    notes,
    termsCondition,
    total,
    subtotal,
    tax,
    docAttached,
    paymentPercentage,
    paymentAmount,
    totalBalance,
    costCenter,
    expenseAccount,
  } = req.body;

  // Find the existing bill
  const existingBill = await Bills.findById(billId);

  if (!existingBill) {
    throw new NotFoundError('Bill not found');
  }

  const baseId = existingBill.id.split('-REV')[0];
  const currentRevision = existingBill.id.includes('-REV')
    ? parseInt(existingBill.id.split('-REV')[1])
    : 0;

  const newRevision = currentRevision + 1;

  const newId = `${baseId}-REV${newRevision}`;

  if (
    existingBill.approval === 'approved1' ||
    existingBill.approval === 'approved2' ||
    existingBill.approval === 'none'
  ) {
    // for (const item of existingBill.items) {
    //   if (item.itemId && item.itemId !== '') {
    //     const product = await Product.findOne({ _id: item.itemId });
    //     if (product && product.inventoryAccount) {
    //       const updateInventoryAccount = await Account.findOne({
    //         _id: product.inventoryAccount,
    //         organization,
    //       });
    //       if (updateInventoryAccount) {
    //         updateInventoryAccount.amount -= Number(
    //           item.price * item.quantity
    //         );
    //         await updateInventoryAccount.save();
    //       }

    //       // Update product quantities
    //       product.quantityToBeBilled += item.quantity;
    //       await product.save();
    //     }
    //   } else if (item.fleetId && item.fleetId !== '') {
    //     const fleet = await InventoryFleet.findOne({ _id: item.fleetId });
    //     if (fleet && fleet.inventoryAccount) {
    //       const updateInventoryAccount = await Account.findOne({
    //         _id: fleet.inventoryAccount,
    //         organization,
    //       });
    //       if (updateInventoryAccount) {
    //         updateInventoryAccount.amount -= Number(
    //           item.price * item.quantity
    //         );
    //         await updateInventoryAccount.save();
    //       }

    //       // Update fleet quantities
    //       fleet.quantityToBeBilled += item.quantity;
    //       await fleet.save();
    //     }
    //   }
    // }

    const vendor = await Vendor.findById(existingBill.vendor).select(
      'displayName'
    );

    const accountsPayable = await Account.findOne({
      accountName: vendor.displayName,
      organization: existingBill.organization,
    });

    if (accountsPayable) {
      accountsPayable.amount -= Number(existingBill.total);
      await accountsPayable.save();
    }

    const organization = await Organization.findById(
      existingBill.organization
    ).select('isAccrualAccounting');

    if (organization.isAccrualAccounting) {
      await Account.findByIdAndUpdate(existingBill.expenseAccount, {
        $inc: {
          amount: -Number(existingBill.total),
        },
      });
    }

    await Transaction.deleteMany({
      type: 'bill',
      id: existingBill.id,
      organization: existingBill.organization,
    });

    if (existingBill.costCenter && existingBill.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        existingBill.costCenter,
        {
          $push: {
            expense: {
              purchaseId: existingBill.id,
              amount: Number(existingBill.total),
              date: existingBill.billDate,
            },
          },
          $inc: {
            totalExpense: -Number(existingBill.total),
          },
        },
        { new: true }
      );
    }
  }

  const hasApproval = await ifHasApproval(
    'paymentrequest',
    existingBill.organization
  );

  // Update bill fields
  existingBill.vendor = vendor;
  existingBill.orderNo = orderNo;
  existingBill.items = items;
  existingBill.billDate = billDate;
  existingBill.dueDate = dueDate;
  existingBill.subject = subject;
  existingBill.paymentTerms = paymentTerms;
  existingBill.notes = notes;
  existingBill.termsCondition = termsCondition;
  existingBill.total = total;
  existingBill.subtotal = subtotal;
  existingBill.tax = tax;
  existingBill.user = req.id;
  existingBill.approval = hasApproval ? 'pending' : 'none';
  existingBill.verifiedBy = null;
  existingBill.verifiedAt = null;
  existingBill.reviewedBy = null;
  existingBill.reviewedAt = null;
  existingBill.approvedBy1 = null;
  existingBill.approvedAt1 = null;
  existingBill.approvedBy2 = null;
  existingBill.approvedAt2 = null;
  existingBill.acknowledgedBy = null;
  existingBill.acknowledgedAt = null;
  existingBill.docAttached = docAttached;
  existingBill.partialStatus = totalBalance === 0 ? 'full' : 'partial';
  existingBill.paymentPercentage = paymentPercentage;
  existingBill.paymentAmount = paymentAmount;
  existingBill.totalBalance = totalBalance;
  existingBill.costCenter = costCenter;
  existingBill.expenseAccount = expenseAccount;

  // Save updated bill
  existingBill.id = newId;
  const updatedBill = await existingBill.save();

  // Update related PurchaseReceived documents
  await PurchaseReceived.updateMany(
    { _id: { $in: orderNo } },
    { $set: { status: 'billed' } }
  );

  if (!hasApproval) {
    await approveBill(existingBill);
  }

  // Update notifications
  // await TaskNotification.updateMany(
  //   { bill: existingBill._id },
  //   { $set: { date: new Date() } }
  // );

  await createActivityLog({
    userId: req.id,
    action: 'update',
    type: 'bills',
    actionId: updatedBill.id,
    organization: updatedBill.organization,
    company: updatedBill.company,
  });

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(updatedBill.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(200).json({
    success: true,
    message: 'Bill updated successfully',
    data: updatedBill,
  });
});

const getBillsByAgent = asyncHandler(async (req, res) => {
  const purchase = await Bills.find({
    user: req.id,
  })
    .populate('vendor')
    .populate('orderNo');
  res.json({
    success: true,
    message: 'Bills fetched successfully',
    data: purchase,
  });
});

const getBillsByOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const purchase = await Bills.find({
    organization: orgid,
  })
    .populate('vendor')
    .populate('orderNo');
  res.json({
    success: true,
    message: 'Bills fetched successfully',
    data: purchase,
  });
});

const getBillById = asyncHandler(async (req, res) => {
  const billId = req.params.id;

  const purchase = await Bills.findById(billId)
    .populate('vendor')
    .populate('company')
    .populate('order', 'id')
    .populate('poNo', 'id')
    .populate('costCenter', 'code')
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
    .populate('acknowledgedBy', [
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

  res.json({
    success: true,
    message: 'Bill fetched successfully',
    data: purchase,
  });
});

// to get all bills of a particular vendor
const getBillOfVendor = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  // Find all bills where the vendor field matches the provided vendorId
  const bills = await Bills.find({
    vendor: vendorId,
    status: 'pending',
    valid: true,
  })
    .populate('orderNo')
    .populate({
      path: 'orderNo',
      populate: {
        path: 'purchaseOrder',
        select: 'id',
      },
      select: ['purchaseOrder'],
    })
    .populate('poNo', 'id');
  res.json({
    success: true,
    message: 'Bills fetched successfully',
    data: bills,
  });
});

const markAsPaid = asyncHandler(async (req, res) => {
  const billId = req.params.id;

  const updatedBill = await Bills.findByIdAndUpdate(
    billId,
    { status: 'paid' },
    { new: true }
  );

  if (!updatedBill) {
    throw new NotFoundError('Bill not found');
  }

  res.status(200).json({
    success: true,
    message: 'Bill marked as paid successfully',
    data: updatedBill,
  });
});

const approveBillUpdate = asyncHandler(async (req, res) => {
  const { approval, approvedBy } = req.body;
  const bill = await Bills.findById(req.params.id);
  if (!bill) {
    throw new NotFoundError('Bill not found');
  }

  const oldApproval = bill.approval;

  bill.approval = approval;
  if (approval === 'approved1') {
    bill.approvedBy1 = approvedBy || null;
    bill.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    bill.approvedBy2 = approvedBy || null;
    bill.approvedAt2 = new Date();
  }

  const updatedBill = await bill.save();

  if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
    await approveBill(updatedBill);

    if (approval === 'approved1') {
      await findNextApprovalLevelAndNotify(
        'paymentrequest',
        approval,
        updatedBill.organization,
        updatedBill.company,
        updatedBill.id,
        'Bill',
        'billsList',
        updatedBill._id
      );
    }

    await createActivityLog({
      userId: req.id,
      action: 'approve',
      type: 'bills',
      actionId: updatedBill.id,
      organization: updatedBill.organization,
      company: updatedBill.company,
    });
  }
  res.status(200).json({
    success: true,
    message: 'Bill approved successfully',
    data: updatedBill,
  });
});

const rejectBill = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;
  const updatedBill = await Bills.findOneAndUpdate(
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
    updatedBill.approval === 'approved1' ||
    updatedBill.approval === 'approved2'
  ) {
    await PurchaseReceived.updateMany(
      { _id: { $in: updatedBill?.orderNo } },
      { $set: { status: 'pending' } }
    );

    // for (const item of updatedBill.items) {
    //   if (item.itemId && item.itemId !== '') {
    //     const product = await Product.findOne({ _id: item.itemId });
    //     if (product && product.inventoryAccount) {
    //       const updateInventoryAccount = await Account.findOne({
    //         _id: product.inventoryAccount,
    //         organization: updatedBill.organization,
    //       });
    //       if (updateInventoryAccount) {
    //         updateInventoryAccount.amount -= Number(
    //           item.price * item.quantity
    //         );
    //         await updateInventoryAccount.save();
    //       }

    //       // Update product quantities
    //       product.quantityToBeBilled += item.quantity;
    //       await product.save();
    //     }
    //   } else if (item.fleetId && item.fleetId !== '') {
    //     const fleet = await InventoryFleet.findOne({ _id: item.fleetId });
    //     if (fleet && fleet.inventoryAccount) {
    //       const updateInventoryAccount = await Account.findOne({
    //         _id: fleet.inventoryAccount,
    //         organization: updatedBill.organization,
    //       });
    //       if (updateInventoryAccount) {
    //         updateInventoryAccount.amount -= Number(
    //           item.price * item.quantity
    //         );
    //         await updateInventoryAccount.save();
    //       }

    //       // Update fleet quantities
    //       fleet.quantityToBeBilled += item.quantity;
    //       await fleet.save();
    //     }
    //   }
    // }

    const organization = await Organization.findById(
      updatedBill.organization
    ).select('isAccrualAccounting');

    if (organization.isAccrualAccounting) {
      await Account.findByIdAndUpdate(updatedBill.expenseAccount, {
        $inc: {
          amount: -Number(updatedBill.total),
        },
      });
    }

    await Transaction.deleteMany({
      type: 'bill',
      id: updatedBill.id,
      organization: updatedBill.organization,
    });

    if (updatedBill.costCenter && updatedBill.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        updatedBill.costCenter,
        {
          $push: {
            expense: {
              purchaseId: updatedBill.id,
              amount: Number(updatedBill.total),
              date: updatedBill.billDate,
            },
          },
          $inc: {
            totalExpense: -Number(updatedBill.total),
          },
        },
        { new: true }
      );
    }
  }

  await createActivityLog({
    userId: req.id,
    action: 'reject',
    type: 'bills',
    actionId: updatedBill.id,
    organization: updatedBill.organization,
    company: updatedBill.company,
  });

  res.status(201).json({
    success: true,
    message: 'Bill rejected successfully',
    data: updatedBill,
  });
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const bill = await Bills.findById(id);
  if (!bill) {
    throw new NotFoundError('Bill not found');
  }

  const resetFields = () => {
    bill.verifiedBy = null;
    bill.approvedBy1 = null;
    bill.approvedBy2 = null;
    bill.verifiedAt = null;
    bill.approvedAt1 = null;
    bill.approvedAt2 = null;
    bill.reviewedBy = null;
    bill.reviewedAt = null;
    bill.acknowledgedBy = null;
    bill.acknowledgedAt = null;
  };

  bill.approval = approval;
  switch (approval) {
    case 'reviewed':
      bill.reviewedBy = req.id || null;
      bill.reviewedAt = new Date();
      bill.verifiedBy = null;
      bill.verifiedAt = null;
      bill.acknowledgedBy = null;
      bill.acknowledgedAt = null;
      break;
    case 'verified':
      bill.verifiedBy = req.id || null;
      bill.verifiedAt = new Date();
      bill.acknowledgedBy = null;
      bill.acknowledgedAt = null;
      break;
    case 'acknowledged':
      bill.acknowledgedBy = req.id || null;
      bill.acknowledgedAt = new Date();
      break;
    case 'correction':
      bill.approvalComment = approvalComment || null;
      resetFields();
      break;
    default:
      break;
  }
  const updatedBill = await bill.save();

  await findNextApprovalLevelAndNotify(
    'paymentrequest',
    approval,
    updatedBill.organization,
    updatedBill.company,
    updatedBill.id,
    'Bill',
    'billsList',
    updatedBill._id
  );

  await createActivityLog({
    userId: req.id,
    action: approval,
    type: 'bills',
    actionId: updatedBill.id,
    organization: updatedBill.organization,
    company: updatedBill.company,
  });

  res.status(201).json({
    success: true,
    message: 'Bill approval updated successfully',
    data: updatedBill,
  });
});

const invalidateBill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const bills = await Bills.findByIdAndUpdate(id, {
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

  const hasApproval = await ifHasApproval('paymentrequest', bills.organization);

  await PurchaseReceived.updateMany(
    { _id: { $in: bills?.orderNo } },
    { $set: { status: 'pending' } }
  );

  if (
    bills.approval === 'approved1' ||
    bills.approval === 'approved2' ||
    bills.approval === 'none'
  ) {
    // await bills?.items?.forEach(async (item) => {
    //   if (item.itemId && item.itemId !== '') {
    //     const product = await Product.findOne({ _id: item.itemId });
    //     if (product) {
    //       if (product?.inventoryAccount) {
    //         await Account.findOneAndUpdate(
    //           {
    //             _id: product?.inventoryAccount,
    //           },
    //           {
    //             $inc: {
    //               amount: -Number(item.price * item.quantity),
    //             },
    //           }
    //         );
    //       }
    //       //    product.inWarehouseQuantity += item.quantity;
    //       product.quantityToBeBilled += item.quantity;
    //       //    product.quantityToBeReceived -= item.quantity;
    //       await product.save();
    //     }
    //   } else if (item.fleetId && item.fleetId !== '') {
    //     const fleet = await InventoryFleet.findOne({ _id: item.fleetId });
    //     if (fleet) {
    //       if (fleet?.inventoryAccount) {
    //         await Account.findOneAndUpdate(
    //           {
    //             _id: fleet?.inventoryAccount,
    //           },
    //           {
    //             $inc: {
    //               amount: -Number(item.price * item.quantity),
    //             },
    //           }
    //         );
    //       }
    //       //    product.inWarehouseQuantity += item.quantity;
    //       fleet.quantityToBeBilled += item.quantity;
    //       //    product.quantityToBeReceived -= item.quantity;
    //       await fleet.save();
    //     }
    //   }
    // });

    const vendor = await Vendor.findById(bills.vendor).select('displayName');

    const accountsPayable = await Account.findOne({
      accountName: vendor.displayName,
      organization: bills.organization,
    });

    if (accountsPayable) {
      accountsPayable.amount -= Number(bills.total);
      await accountsPayable.save();
    }

    const organization = await Organization.findById(bills.organization).select(
      'isAccrualAccounting'
    );

    if (organization.isAccrualAccounting) {
      await Account.findByIdAndUpdate(bills.expenseAccount, {
        $inc: {
          amount: -Number(bills.total),
        },
      });
    }

    await Transaction.deleteMany({
      id: bills.id,
      type: 'bill',
      organization: bills.organization,
    });

    if (bills.costCenter && bills.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        bills.costCenter,
        {
          $push: {
            expense: {
              purchaseId: bills.id,
              amount: Number(bills.total),
              date: bills.billDate,
            },
          },
          $inc: {
            totalExpense: -Number(bills.total),
          },
        },
        { new: true }
      );
    }
  }

  bills.approval = hasApproval ? 'rejected' : 'none';
  await bills.save();

  if (!hasApproval) {
    await approveBill(bills);
  }

  await createActivityLog({
    userId: req.id,
    action: 'invalidate',
    type: 'bills',
    actionId: bills.id,
    organization: bills.organization,
    company: bills.company,
  });

  res.status(201).json({
    success: true,
    message: 'Bill approval updated successfully',
    data: bills,
  });
});

const getBillTreeView = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = {
    purchasereceive: null,
    purchaseorder: null,
    rfp: null,
  };

  const bill = await Bills.findById(id);

  if (bill.orderNo) {
    const purchasereceive = await PurchaseReceived.findById(bill.orderNo);

    if (purchasereceive.purchaseOrder) {
      const purchaseorder = await PurchaseOrder.findById(
        purchasereceive.purchaseOrder
      );

      if (purchaseorder.rfpId) {
        result.rfp = purchaseorder.rfpId;
      }

      result.purchaseorder = purchasereceive.purchaseOrder;
    }
    result.purchasereceive = bill.orderNo;
  } else {
    if (bill.poNo) {
      const purchaseorder = await PurchaseOrder.findById(bill.poNo);

      if (purchaseorder.rfpId) {
        result.rfp = purchaseorder.rfpId;
      }

      result.purchaseorder = bill.poNo;
    }
  }

  res.status(200).json({
    success: true,
    message: 'Bill tree view',
    data: result,
  });
});

//filter
const getFilteredBills = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const {
    filter_status,
    filter_approval,
    filter_validity,
    filter_vendor,
    filter_vendorName,
    search_query = '',
    startDate,
    endDate,
    page = 1,
    limit = 25,
    sort_by = 'billDate',
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
    organization: orgId,
  };

  if (filter_status) {
    query.status = filter_status;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (filter_validity) {
    query.valid = filter_validity;
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
    query.billDate = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'vendor', select: 'displayName currency' },
      { path: 'poNo', select: 'id' },
      { path: 'costCenter', select: 'code' },
    ],
  };

  const result = await Bills.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Bills filtered successfully',
    data: {
      bills: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalBills: result.totalDocs,
    },
  });
});

const getFilteredBillsWithoutPagination = asyncHandler(async (req, res) => {
  const orgId = req.params.orgid;
  const {
    filter_status,
    filter_approval,
    filter_validity,
    filter_vendor,
    filter_vendorName,
    search_query = '',
    startDate,
    endDate,
    sort_by = 'billDate',
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
    organization: orgId,
  };

  if (filter_status) {
    query.status = filter_status;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (filter_validity) {
    query.valid = filter_validity;
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
    query.billDate = dateFilter;
  }

  const bills = await Bills.find(query)
    .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 })
    .select(
      'billDate id poNo costCenter order vendor status dueDate total approval createdAt'
    )
    .populate('vendor', 'displayName currency')
    .populate('poNo', 'id')
    .populate('costCenter', 'code');

  res.status(200).json({
    success: true,
    message: 'Bills filtered successfully',
    data: {
      bills,
      totalBills: bills.length,
    },
  });
});

const getFilteredBillsByAgent = asyncHandler(async (req, res) => {
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
    sort_by = 'billDate',
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
    query.billDate = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'vendor', select: 'displayName currency' },
      { path: 'orderNo', select: 'id' },
    ],
  };

  const result = await Bills.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Bills filtered successfully',
    data: {
      bills: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalBills: result.totalDocs,
    },
  });
});

const deleteBill = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const bill = await Bills.findByIdAndDelete(id);
  res.status(200).json({
    success: true,
    message: 'Bill deleted successfully',
    data: bill,
  });
});

const checkExistId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { chanageId } = req.query;

  const bills = await Bills.findOne({
    organization: orgid,
    id: chanageId,
  });

  if (bills) {
    return res.status(400).json({ data: { error: 'This ID already exists' } });
  }

  return res.json({ success: true, message: 'ID is available' });
});

module.exports = {
  createPartialBill,
  createBill,
  updateBill,
  revisedBill,
  getBillsByAgent,
  getBillsByOrganization,
  getBillById,
  getBillOfVendor,
  markAsPaid,
  approveBillUpdate,
  rejectBill,
  updateApproval,
  invalidateBill,
  getBillTreeView,
  getFilteredBills,
  getFilteredBillsWithoutPagination,
  getFilteredBillsByAgent,
  deleteBill,
  checkExistId,
};
