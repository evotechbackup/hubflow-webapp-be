const LastInsertedId = require('../../models/master/LastInsertedID');
const PaymentMade = require('../../models/procurement/PaymentMade');
const Bill = require('../../models/procurement/Bills');
const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
const PurchaseOrder = require('../../models/procurement/PurchaseOrder');
const Vendor = require('../../models/procurement/Vendor');
const CostCenter = require('../../models/accounts/CostCenter');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../utils/approvalUtils');
const { createActivityLog } = require('../../utils/logUtils');
const { default: mongoose } = require('mongoose');
const ParentAccount = require('../../models/accounts/ParentAccount');
const Organization = require('../../models/auth/Organization');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError, ServerError } = require('../../utils/errors');

const approvePaymentMade = async (paymentMade) => {
  const vendor = await Vendor.findById(paymentMade.vendor).select(
    'displayName'
  );

  let accountsPayable = await Account.findOne({
    accountName: vendor.displayName,
    organization: paymentMade.organization,
  });

  if (!accountsPayable) {
    const parentAccount = await ParentAccount.findOne({
      accountName: 'Accounts Payable',
      organization: paymentMade.organization,
    });

    const newAccount = new Account({
      accountName: vendor.displayName,
      accountType: 'currentliability',
      accountCode: `AC-CL-AP-${parentAccount?.childAccounts?.length + 1}`,
      currency: 'AED',
      description: '',
      parentAccount: parentAccount._id,
      organization: paymentMade.organization,
      company: paymentMade.company,
    });
    accountsPayable = await newAccount.save();

    parentAccount.childAccounts.push(newAccount._id);
    await parentAccount.save();
  }

  accountsPayable.amount -= Number(paymentMade.amountPaid);
  await accountsPayable.save();

  const transaction = new Transaction({
    account: accountsPayable._id,
    type: 'payment made',
    vendor: paymentMade.vendor,
    reference: paymentMade.id,
    id: vendor?.displayName || '',
    debit: Number(paymentMade.amountPaid),
    runningBalance: accountsPayable?.amount,
    organization: paymentMade.organization,
    company: paymentMade.company,
  });
  await transaction.save();

  const paymentAccount = await Account.findOne({
    _id: paymentMade.paidThrough,
  });
  paymentAccount.amount -= Number(paymentMade.amountPaid);
  await paymentAccount.save();
  const transaction2 = new Transaction({
    account: paymentAccount._id,
    type: 'payment made',
    vendor: paymentMade.vendor,
    reference: paymentMade.id,
    id: vendor?.displayName || '',
    credit: Number(paymentMade.amountPaid),
    runningBalance: paymentAccount?.amount,
    organization: paymentMade.organization,
    company: paymentMade.company,
  });
  await transaction2.save();

  const organization = await Organization.findById(
    paymentMade.organization
  ).select('isAccrualAccounting');

  if (!organization.isAccrualAccounting) {
    const expenseAccount = await Account.findById(paymentMade.expenseAccount);
    expenseAccount.amount += Number(paymentMade.amountPaid);
    await expenseAccount.save();
    const transaction3 = new Transaction({
      account: expenseAccount._id,
      type: 'payment made',
      vendor: paymentMade.vendor,
      reference: paymentMade.id,
      id: vendor?.displayName || '',
      debit: Number(paymentMade.amountPaid),
      runningBalance: expenseAccount?.amount,
      organization: paymentMade.organization,
      company: paymentMade.company,
    });
    await transaction3.save();
  }

  if (paymentMade.costCenter && paymentMade.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      paymentMade.costCenter,
      {
        $push: {
          expense: {
            purchaseId: paymentMade.id,
            amount: Number(paymentMade.amountPaid),
            account: paymentMade.paidThrough,
            date: paymentMade.paymentDate,
          },
        },
        $inc: {
          totalExpense: Number(paymentMade.amountPaid),
        },
      },
      { new: true }
    );
  }
};

//to post new partial payment made
const createPartialPaymentMade = asyncHandler(async (req, res) => {
  const {
    vendor,
    paymentDate,
    paymentMode,
    paidThrough,
    billsData,
    notes,
    termsCondition,
    amountPaid,
    company,
    organization,
    currentId,
    contactPerson,
    totalBalance,
    paymentFromPO,
    purchaseOrderId,
    items,
    docAttached,
    expenseAccount,
  } = req.body;

  const partialId = currentId.split('-P-');
  const newId =
    Number(totalBalance) === 0
      ? partialId[0]
      : `${partialId[0]}-P-${Number(partialId[1]) + 1}`;

  const hasApproval = await ifHasApproval('paymentvoucher', organization);

  const newPartialPayment = new PaymentMade({
    id: newId,
    vendor,
    paymentDate,
    paymentMode,
    paidThrough,
    billsData,
    notes,
    termsCondition,
    amountPaid,
    company,
    organization,
    user: req.id,
    contactPerson,
    totalBalance,
    status: Number(totalBalance) === 0 ? 'paid' : 'partial',
    paymentFromPO,
    purchaseOrderId,
    items,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
    expenseAccount,
  });
  const savedPartialPayment = await newPartialPayment.save();

  // Update bills and purchase quotations
  if (!paymentFromPO) {
    const billIdsToUpdate = billsData.map((bill) => bill.billNo);
    const poIdsToUpdate = billsData.map((bill) => bill.purchaseOrder);
    await Bill.updateMany(
      { _id: { $in: billIdsToUpdate } },
      { $set: { status: Number(totalBalance) === 0 ? 'paid' : 'partial' } }
    );

    await PurchaseOrder.updateMany(
      { _id: { $in: poIdsToUpdate } },
      {
        $set: {
          paymentStatus: Number(totalBalance) === 0 ? 'paid' : 'partial',
        },
      }
    );
  } else {
    await PurchaseOrder.updateOne(
      { _id: purchaseOrderId },
      {
        $set: {
          paymentStatus: Number(totalBalance) === 0 ? 'paid' : 'advance',
          amountDue: Number(totalBalance),
        },
      }
    );
  }

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'paymentmade',
    actionId: savedPartialPayment.id,
    organization: savedPartialPayment.organization,
    company: savedPartialPayment.company,
  });

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'paymentvoucher',
      'pending',
      savedPartialPayment.organization,
      savedPartialPayment.company,
      savedPartialPayment.id,
      'Payment Voucher',
      'paymentvoucher',
      savedPartialPayment._id
    );
  } else {
    await approvePaymentMade(savedPartialPayment);
  }

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(savedPartialPayment.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Partial Payment Made created successfully',
    data: savedPartialPayment,
  });
});

//to post new payment made
const createPaymentMade = asyncHandler(async (req, res) => {
  const { id, customID, organization } = req.body;
  let lastInsertedId = await LastInsertedId.findOne({
    entity: 'paymentMade',
    organization,
  });
  if (!lastInsertedId) {
    lastInsertedId = new LastInsertedId({
      entity: 'paymentMade',
      organization,
    });
    await lastInsertedId.save();
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
    paymentDate,
    paymentMode,
    paidThrough,
    billsData,
    notes,
    termsCondition,
    amountPaid,
    company,
    contactPerson,
    totalBalance,
    paymentFromPO,
    purchaseOrderId,
    items,
    costCenter,
    docAttached,
    expenseAccount,
  } = req.body;

  let paddedId = String(lastInsertedId.lastId).padStart(3, '0');

  paddedId += Number(totalBalance) === 0 ? '' : '-P-1';

  const hasApproval = await ifHasApproval('paymentvoucher', organization);

  const newPaymentMade = new PaymentMade({
    id: customID ? customID : billsPrefix + paddedId,
    vendor,
    paymentDate,
    paymentMode,
    paidThrough,
    billsData,
    notes,
    termsCondition,
    amountPaid,
    company,
    organization,
    user: req.id,
    contactPerson,
    totalBalance,
    status: Number(totalBalance) === 0 ? 'paid' : 'partial',
    paymentFromPO,
    purchaseOrderId,
    items,
    costCenter,
    approval: hasApproval ? 'pending' : 'none',
    docAttached,
    expenseAccount,
  });
  const savedPaymentMade = await newPaymentMade.save();
  if (!paymentFromPO) {
    const billIdsToUpdate = billsData.map((bill) => bill.billNo);
    const poIdsToUpdate = billsData.map((bill) => bill.purchaseOrder);
    await Bill.updateMany(
      { _id: { $in: billIdsToUpdate } },
      { $set: { status: Number(totalBalance) === 0 ? 'paid' : 'partial' } }
    );

    await PurchaseOrder.updateMany(
      { _id: { $in: poIdsToUpdate } },
      {
        $set: {
          paymentStatus: Number(totalBalance) === 0 ? 'paid' : 'partial',
        },
      }
    );
  } else {
    await PurchaseOrder.updateOne(
      { _id: purchaseOrderId },
      {
        $set: {
          paymentStatus: Number(totalBalance) === 0 ? 'paid' : 'advance',
          amountDue: Number(totalBalance),
        },
      }
    );
  }

  await createActivityLog({
    userId: req.id,
    action: 'create',
    type: 'paymentmade',
    actionId: savedPaymentMade.id,
    organization: savedPaymentMade.organization,
    company: savedPaymentMade.company,
  });

  if (hasApproval) {
    await findNextApprovalLevelAndNotify(
      'paymentvoucher',
      'pending',
      savedPaymentMade.organization,
      savedPaymentMade.company,
      savedPaymentMade.id,
      'Payment Voucher',
      'paymentvoucher',
      savedPaymentMade._id
    );
  } else {
    await approvePaymentMade(savedPaymentMade);
  }

  // Generate embedding for the vendor
  // try {
  //   const vendor = await Vendor.findById(savedPaymentMade.vendor);
  //   if (vendor) {
  //     await vendor.generateEmbedding();
  //   }
  // } catch (error) {
  //   console.error('Error generating embedding for vendor:', error);
  // }

  res.status(201).json({
    success: true,
    message: 'Payment Made created successfully',
    data: savedPaymentMade,
  });
});

const updatePaymentMade = asyncHandler(async (req, res) => {
  // Start a new session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      vendor,
      paymentDate,
      paymentMode,
      paidThrough,
      billsData,
      notes,
      termsCondition,
      amountPaid,
      contactPerson,
      totalBalance,
      paymentFromPO,
      purchaseOrderId,
      items,
      costCenter,
      docAttached,
      expenseAccount,
    } = req.body;

    const paymentmade = await PaymentMade.findById(id).session(session);
    if (!paymentmade) {
      await session.abortTransaction();
      session.endSession();
      throw new NotFoundError('Payment Made not found');
    }

    if (!paymentmade.paymentFromPO) {
      const billIdsToUpdate = paymentmade?.billsData?.map(
        (bill) => bill.billNo
      );
      const poIdsToUpdate = paymentmade?.billsData?.map(
        (bill) => bill.purchaseOrder
      );
      await Bill.updateMany(
        { _id: { $in: billIdsToUpdate } },
        { $set: { status: 'pending' } },
        { session }
      );

      await PurchaseOrder.updateMany(
        { _id: { $in: poIdsToUpdate } },
        { $set: { paymentStatus: 'pending' } },
        { session }
      );
    } else {
      await PurchaseOrder.updateOne(
        { _id: paymentmade.purchaseOrderId },
        { $set: { paymentStatus: 'pending' } },
        { session }
      );
    }

    if (
      paymentmade.approval === 'approved1' ||
      paymentmade.approval === 'approved2' ||
      paymentmade.approval === 'none'
    ) {
      const vendor = await Vendor.findById(paymentmade.vendor).select(
        'displayName'
      );

      const accountsPayable = await Account.findOne({
        accountName: vendor.displayName,
        organization: paymentmade.organization,
      });

      if (accountsPayable) {
        accountsPayable.amount += Number(paymentmade.amountPaid);
        await accountsPayable.save({ session });
      }

      await Account.findOneAndUpdate(
        {
          _id: paymentmade.paidThrough,
        },
        {
          $inc: {
            amount: Number(paymentmade.amountPaid),
          },
        },
        { session }
      );

      const organization = await Organization.findById(
        paymentmade.organization
      ).select('isAccrualAccounting');

      if (!organization.isAccrualAccounting) {
        await Account.findByIdAndUpdate(
          paymentmade.expenseAccount,
          {
            $inc: {
              amount: -Number(paymentmade.amountPaid),
            },
          },
          { session }
        );
      }

      if (paymentmade.costCenter && paymentmade.costCenter !== '') {
        await CostCenter.findByIdAndUpdate(
          paymentmade.costCenter,
          {
            $pull: {
              expense: {
                purchaseId: paymentmade.id,
                amount: Number(paymentmade.amountPaid),
                date: paymentmade.paymentDate,
                account: paymentmade.expenseAccount,
              },
            },
            $inc: {
              totalExpense: -Number(paymentmade.amountPaid),
            },
          },
          { new: true, session }
        );
      }

      await Transaction.deleteMany({ id: paymentmade.id }).session(session);
    }

    const hasApproval = await ifHasApproval(
      'paymentvoucher',
      paymentmade.organization
    );

    paymentmade.vendor = vendor;
    paymentmade.paymentDate = paymentDate;
    paymentmade.paymentMode = paymentMode;
    paymentmade.paidThrough = paidThrough;
    paymentmade.billsData = billsData;
    paymentmade.notes = notes;
    paymentmade.termsCondition = termsCondition;
    paymentmade.amountPaid = amountPaid;
    paymentmade.contactPerson = contactPerson;
    paymentmade.totalBalance = totalBalance;
    paymentmade.paymentFromPO = paymentFromPO;
    paymentmade.purchaseOrderId = purchaseOrderId;
    paymentmade.items = items;
    paymentmade.costCenter = costCenter;
    paymentmade.docAttached = docAttached;
    paymentmade.expenseAccount = expenseAccount;
    paymentmade.status = Number(totalBalance) === 0 ? 'paid' : 'partial';
    paymentmade.approval = hasApproval ? 'pending' : 'none';
    paymentmade.verifiedAt = null;
    paymentmade.verifiedBy = null;
    paymentmade.reviewedAt = null;
    paymentmade.reviewedBy = null;
    paymentmade.approvedAt1 = null;
    paymentmade.approvedBy1 = null;
    paymentmade.approvedAt2 = null;
    paymentmade.approvedBy2 = null;
    paymentmade.acknowledgedAt = null;
    paymentmade.acknowledgedBy = null;
    const savedPaymentMade = await paymentmade.save({ session });

    if (!paymentFromPO) {
      const billIdsToUpdate = billsData.map((bill) => bill.billNo);
      const poIdsToUpdate = billsData.map((bill) => bill.purchaseOrder);
      await Bill.updateMany(
        { _id: { $in: billIdsToUpdate } },
        { $set: { status: Number(totalBalance) === 0 ? 'paid' : 'partial' } },
        { session }
      );

      await PurchaseOrder.updateMany(
        { _id: { $in: poIdsToUpdate } },
        {
          $set: {
            paymentStatus: Number(totalBalance) === 0 ? 'paid' : 'partial',
          },
        },
        { session }
      );
    } else {
      await PurchaseOrder.updateOne(
        { _id: purchaseOrderId },
        {
          $set: {
            paymentStatus: Number(totalBalance) === 0 ? 'paid' : 'advance',
            amountDue: Number(totalBalance),
          },
        },
        { session }
      );
    }

    if (!hasApproval) {
      await approvePaymentMade(savedPaymentMade);
    }

    await createActivityLog({
      userId: req.id,
      action: 'update',
      type: 'paymentmade',
      actionId: savedPaymentMade.id,
      organization: savedPaymentMade.organization,
      company: savedPaymentMade.company,
    });

    // Generate embedding for the vendor
    // try {
    //   const vendor = await Vendor.findById(savedPaymentMade.vendor).session(
    //     session
    //   );
    //   if (vendor) {
    //     await vendor.generateEmbedding();
    //   }
    // } catch (error) {
    //   console.error('Error generating embedding for vendor:', error);
    // }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Payment Made updated successfully',
      data: savedPaymentMade,
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating Payment Made:', error);
    throw new ServerError();
  }
});

const revisePaymentMade = asyncHandler(async (req, res) => {
  // Start a new session
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const {
      vendor,
      paymentDate,
      paymentMode,
      paidThrough,
      billsData,
      notes,
      termsCondition,
      amountPaid,
      contactPerson,
      totalBalance,
      paymentFromPO,
      purchaseOrderId,
      items,
      costCenter,
      docAttached,
      expenseAccount,
    } = req.body;

    const paymentmade = await PaymentMade.findById(id).session(session);
    if (!paymentmade) {
      await session.abortTransaction();
      session.endSession();
      throw new NotFoundError('Payment Made not found');
    }

    const baseId = paymentmade.id.split('-REV')[0];
    const currentRevision = paymentmade.id.includes('-REV')
      ? parseInt(paymentmade.id.split('-REV')[1])
      : 0;

    const newRevision = currentRevision + 1;

    const newId = `${baseId}-REV${newRevision}`;

    if (!paymentmade.paymentFromPO) {
      const billIdsToUpdate = paymentmade?.billsData?.map(
        (bill) => bill.billNo
      );
      const poIdsToUpdate = paymentmade?.billsData?.map(
        (bill) => bill.purchaseOrder
      );
      await Bill.updateMany(
        { _id: { $in: billIdsToUpdate } },
        { $set: { status: 'pending' } },
        { session }
      );

      await PurchaseOrder.updateMany(
        { _id: { $in: poIdsToUpdate } },
        { $set: { paymentStatus: 'pending' } },
        { session }
      );
    } else {
      await PurchaseOrder.updateOne(
        { _id: paymentmade.purchaseOrderId },
        { $set: { paymentStatus: 'pending' } },
        { session }
      );
    }

    if (
      paymentmade.approval === 'approved1' ||
      paymentmade.approval === 'approved2' ||
      paymentmade.approval === 'none'
    ) {
      const vendor = await Vendor.findById(paymentmade.vendor).select(
        'displayName'
      );

      const accountsPayable = await Account.findOne({
        accountName: vendor.displayName,
        organization: paymentmade.organization,
      });

      if (accountsPayable) {
        accountsPayable.amount += Number(paymentmade.amountPaid);
        await accountsPayable.save({ session });
      }

      await Account.findOneAndUpdate(
        {
          _id: paymentmade.paidThrough,
        },
        {
          $inc: {
            amount: Number(paymentmade.amountPaid),
          },
        },
        { session }
      );

      const organization = await Organization.findById(
        paymentmade.organization
      ).select('isAccrualAccounting');

      if (!organization.isAccrualAccounting) {
        await Account.findByIdAndUpdate(
          paymentmade.expenseAccount,
          {
            $inc: {
              amount: -Number(paymentmade.amountPaid),
            },
          },
          { session }
        );
      }

      if (paymentmade.costCenter && paymentmade.costCenter !== '') {
        await CostCenter.findByIdAndUpdate(
          paymentmade.costCenter,
          {
            $pull: {
              expense: {
                purchaseId: paymentmade.id,
                amount: Number(paymentmade.amountPaid),
                date: paymentmade.paymentDate,
                account: paymentmade.expenseAccount,
              },
            },
            $inc: {
              totalExpense: -Number(paymentmade.amountPaid),
            },
          },
          { new: true, session }
        );
      }

      await Transaction.deleteMany({ id: paymentmade.id }).session(session);
    }

    const hasApproval = await ifHasApproval(
      'paymentvoucher',
      paymentmade.organization
    );

    paymentmade.id = newId;
    paymentmade.vendor = vendor;
    paymentmade.paymentDate = paymentDate;
    paymentmade.paymentMode = paymentMode;
    paymentmade.paidThrough = paidThrough;
    paymentmade.billsData = billsData;
    paymentmade.notes = notes;
    paymentmade.termsCondition = termsCondition;
    paymentmade.amountPaid = amountPaid;
    paymentmade.contactPerson = contactPerson;
    paymentmade.totalBalance = totalBalance;
    paymentmade.paymentFromPO = paymentFromPO;
    paymentmade.purchaseOrderId = purchaseOrderId;
    paymentmade.items = items;
    paymentmade.costCenter = costCenter;
    paymentmade.docAttached = docAttached;
    paymentmade.expenseAccount = expenseAccount;
    paymentmade.status = Number(totalBalance) === 0 ? 'paid' : 'partial';
    paymentmade.approval = hasApproval ? 'pending' : 'none';
    paymentmade.verifiedAt = null;
    paymentmade.verifiedBy = null;
    paymentmade.reviewedAt = null;
    paymentmade.reviewedBy = null;
    paymentmade.approvedAt1 = null;
    paymentmade.approvedBy1 = null;
    paymentmade.approvedAt2 = null;
    paymentmade.approvedBy2 = null;
    paymentmade.acknowledgedAt = null;
    paymentmade.acknowledgedBy = null;
    const savedPaymentMade = await paymentmade.save({ session });

    if (!paymentFromPO) {
      const billIdsToUpdate = billsData.map((bill) => bill.billNo);
      const poIdsToUpdate = billsData.map((bill) => bill.purchaseOrder);
      await Bill.updateMany(
        { _id: { $in: billIdsToUpdate } },
        { $set: { status: Number(totalBalance) === 0 ? 'paid' : 'partial' } },
        { session }
      );

      await PurchaseOrder.updateMany(
        { _id: { $in: poIdsToUpdate } },
        {
          $set: {
            paymentStatus: Number(totalBalance) === 0 ? 'paid' : 'partial',
          },
        },
        { session }
      );
    } else {
      await PurchaseOrder.updateOne(
        { _id: purchaseOrderId },
        {
          $set: {
            paymentStatus: Number(totalBalance) === 0 ? 'paid' : 'advance',
            amountDue: Number(totalBalance),
          },
        },
        { session }
      );
    }

    if (!hasApproval) {
      await approvePaymentMade(savedPaymentMade);
    }

    await createActivityLog({
      userId: req.id,
      action: 'update',
      type: 'paymentmade',
      actionId: savedPaymentMade.id,
      organization: savedPaymentMade.organization,
      company: savedPaymentMade.company,
    });

    // Generate embedding for the vendor
    // try {
    //   const vendor = await Vendor.findById(savedPaymentMade.vendor).session(
    //     session
    //   );
    //   if (vendor) {
    //     await vendor.generateEmbedding();
    //   }
    // } catch (error) {
    //   console.error('Error generating embedding for vendor:', error);
    // }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Payment Made updated successfully',
      data: savedPaymentMade,
    });
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();

    // Handle errors
    console.error('Error updating Payment Made:', error);
    throw ServerError();
  }
});

const getPaymentMadeByAgent = asyncHandler(async (req, res) => {
  const purchase = await PaymentMade.find({
    user: req.id,
  })
    .populate('vendor')
    .populate('billsData.billNo')
    .populate('billsData.purchaseOrder');
  res.json({
    success: true,
    data: purchase,
  });
});

// to get all payment made
const getAllPaymentMade = asyncHandler(async (req, res) => {
  const purchase = await PaymentMade.find({
    organization: req.params.orgid,
  })
    .populate('vendor')
    .populate('billsData.billNo')
    .populate('billsData.purchaseOrder');
  res.status(200).json({
    success: true,
    data: purchase,
  });
});

//to get payment made by its ID
const getPaymentMadeById = asyncHandler(async (req, res) => {
  const paymentMadeId = req.params.id;

  const purchase = await PaymentMade.findById(paymentMadeId)
    .populate('vendor')
    .populate('billsData.billNo')
    .populate('billsData.purchaseOrder')
    .populate('purchaseOrderId', ['id', 'items'])
    .populate('paidThrough', 'accountName')
    .populate('expenseAccount', 'accountName')
    .populate('costCenter', 'unit')
    .populate('organization')
    .populate('user', ['signature', 'role', 'fullName', 'userName'])
    .populate('reviewedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('verifiedBy', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy1', ['signature', 'userName', 'role', 'fullName'])
    .populate('approvedBy2', ['signature', 'userName', 'role', 'fullName']);

  res.status(200).json({
    success: true,
    message: 'Payment Made fetched successfully',
    data: purchase,
  });
});

const approvePaymentMadeStatus = asyncHandler(async (req, res) => {
  const { approval } = req.body;
  const paymentMade = await PaymentMade.findById(req.params.id);
  if (!paymentMade) {
    throw new NotFoundError('Payment Made not found');
  }

  const oldApproval = paymentMade.approval;

  paymentMade.approval = approval;
  if (approval === 'approved1') {
    paymentMade.approvedBy1 = req.id || null;
    paymentMade.approvedAt1 = new Date();
  } else if (approval === 'approved2') {
    paymentMade.approvedBy2 = req.id || null;
    paymentMade.approvedAt2 = new Date();
  }

  const updatedPaymentMade = await paymentMade.save();

  if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
    await approvePaymentMade(updatedPaymentMade);

    if (approval === 'approved1') {
      await findNextApprovalLevelAndNotify(
        'paymentvoucher',
        approval,
        updatedPaymentMade.organization,
        updatedPaymentMade.company,
        updatedPaymentMade.id,
        'Payment Voucher',
        'paymentvoucher',
        updatedPaymentMade._id
      );
    }

    await createActivityLog({
      userId: req.id,
      action: 'approve',
      type: 'paymentmade',
      actionId: updatedPaymentMade.id,
      organization: updatedPaymentMade.organization,
      company: updatedPaymentMade.company,
    });
  }
  res.status(201).json({
    success: true,
    message: 'Payment Made approved successfully',
    data: updatedPaymentMade,
  });
});

const rejectPaymentMade = asyncHandler(async (req, res) => {
  const { approvalComment } = req.body;
  const updatedPaymentMade = await PaymentMade.findOneAndUpdate(
    { _id: req.params.id },
    {
      approval: 'rejected',
      approvalComment: approvalComment || null,
      verifiedAt: null,
      verifiedBy: null,
      reviewedAt: null,
      reviewedBy: null,
      approvedAt1: null,
      approvedBy1: null,
      approvedAt2: null,
      approvedBy2: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
    }
  );

  if (!updatedPaymentMade.paymentFromPO) {
    const billIdsToUpdate = updatedPaymentMade?.billsData?.map(
      (bill) => bill.billNo || null
    );
    const poIdsToUpdate = updatedPaymentMade?.billsData?.map(
      (bill) => bill.purchaseOrder || null
    );
    await Bill.updateMany(
      { _id: { $in: billIdsToUpdate } },
      { $set: { status: 'pending' } }
    );

    await PurchaseOrder.updateMany(
      { _id: { $in: poIdsToUpdate } },
      { $set: { paymentStatus: 'pending' } }
    );
  } else {
    await PurchaseOrder.updateOne(
      { _id: updatedPaymentMade.purchaseOrderId },
      { $set: { paymentStatus: 'pending' } }
    );
  }

  if (
    updatedPaymentMade.approval === 'approved1' ||
    updatedPaymentMade.approval === 'approved2'
  ) {
    const vendor = await Vendor.findById(updatedPaymentMade.vendor).select(
      'displayName'
    );

    const accountsPayable = await Account.findOne({
      accountName: vendor.displayName,
      organization: updatedPaymentMade.organization,
    });

    if (accountsPayable) {
      accountsPayable.amount += Number(updatedPaymentMade.amountPaid);
      await accountsPayable.save();
    }

    await Account.findOneAndUpdate(
      {
        _id: updatedPaymentMade.paidThrough,
      },
      {
        $inc: {
          amount: Number(updatedPaymentMade.amountPaid),
        },
      }
    );

    const organization = await Organization.findById(
      updatedPaymentMade.organization
    ).select('isAccrualAccounting');

    if (!organization.isAccrualAccounting) {
      await Account.findByIdAndUpdate(updatedPaymentMade.expenseAccount, {
        $inc: {
          amount: -Number(updatedPaymentMade.amountPaid),
        },
      });
    }

    if (updatedPaymentMade.costCenter && updatedPaymentMade.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        updatedPaymentMade.costCenter,
        {
          $pull: {
            expense: {
              purchaseId: updatedPaymentMade.id,
              amount: Number(updatedPaymentMade.amountPaid),
              account: updatedPaymentMade.paidThrough,
              date: updatedPaymentMade.paymentDate,
            },
          },
          $inc: {
            totalExpense: -Number(updatedPaymentMade.amountPaid),
          },
        },
        { new: true }
      );
    }

    await Transaction.deleteMany({ id: updatedPaymentMade.id });
  }

  await createActivityLog({
    userId: req.id,
    action: 'reject',
    type: 'paymentmade',
    actionId: updatedPaymentMade.id,
    organization: updatedPaymentMade.organization,
    company: updatedPaymentMade.company,
  });

  res.status(201).json({
    success: true,
    message: 'Payment Made rejected successfully',
    data: updatedPaymentMade,
  });
});

const updateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const paymentMade = await PaymentMade.findById(id);
  if (!paymentMade) {
    throw new NotFoundError('Payment Made not found');
  }

  const resetFields = () => {
    paymentMade.verifiedBy = null;
    paymentMade.approvedBy1 = null;
    paymentMade.approvedBy2 = null;
    paymentMade.verifiedAt = null;
    paymentMade.approvedAt1 = null;
    paymentMade.approvedAt2 = null;
    paymentMade.reviewedBy = null;
    paymentMade.reviewedAt = null;
    paymentMade.acknowledgedBy = null;
    paymentMade.acknowledgedAt = null;
  };

  paymentMade.approval = approval;
  switch (approval) {
    case 'reviewed':
      paymentMade.reviewedBy = req.id || null;
      paymentMade.reviewedAt = new Date();
      paymentMade.verifiedBy = null;
      paymentMade.verifiedAt = null;
      paymentMade.acknowledgedBy = null;
      paymentMade.acknowledgedAt = null;
      break;
    case 'verified':
      paymentMade.verifiedBy = req.id || null;
      paymentMade.verifiedAt = new Date();
      paymentMade.acknowledgedBy = null;
      paymentMade.acknowledgedAt = null;
      break;
    case 'acknowledged':
      paymentMade.acknowledgedBy = req.id || null;
      paymentMade.acknowledgedAt = new Date();
      break;
    case 'correction':
      paymentMade.approvalComment = approvalComment || null;
      resetFields();
      break;
    default:
      break;
  }
  const updatedPaymentMade = await paymentMade.save();

  await findNextApprovalLevelAndNotify(
    'paymentvoucher',
    approval,
    updatedPaymentMade.organization,
    updatedPaymentMade.company,
    updatedPaymentMade.id,
    'Payment Voucher',
    'paymentvoucher',
    updatedPaymentMade._id
  );

  await createActivityLog({
    userId: req.id,
    action: approval,
    type: 'paymentmade',
    actionId: updatedPaymentMade.id,
    organization: updatedPaymentMade.organization,
    company: updatedPaymentMade.company,
  });

  res.status(201).json({
    success: true,
    message: 'Payment Made updated successfully',
    data: updatedPaymentMade,
  });
});

const invalidatePaymentMade = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const paymentmade = await PaymentMade.findByIdAndUpdate(id, {
    $set: {
      valid: false,
      verifiedAt: null,
      verifiedBy: null,
      reviewedAt: null,
      reviewedBy: null,
      approvedAt1: null,
      approvedBy1: null,
      approvedAt2: null,
      approvedBy2: null,
      acknowledgedAt: null,
      acknowledgedBy: null,
    },
  });

  const hasApproval = await ifHasApproval(
    'paymentvoucher',
    paymentmade.organization
  );

  if (!paymentmade.paymentFromPO) {
    const billIdsToUpdate = paymentmade?.billsData?.map((bill) => bill.billNo);
    const poIdsToUpdate = paymentmade?.billsData?.map(
      (bill) => bill.purchaseOrder
    );
    await Bill.updateMany(
      { _id: { $in: billIdsToUpdate } },
      { $set: { status: 'pending' } }
    );

    await PurchaseOrder.updateMany(
      { _id: { $in: poIdsToUpdate } },
      { $set: { paymentStatus: 'pending' } }
    );
  } else {
    await PurchaseOrder.updateOne(
      { _id: paymentmade.purchaseOrderId },
      { $set: { paymentStatus: 'pending' } }
    );
  }

  if (
    paymentmade.approval === 'approved1' ||
    paymentmade.approval === 'approved2' ||
    paymentmade.approval === 'none'
  ) {
    const vendor = await Vendor.findById(paymentmade.vendor).select(
      'displayName'
    );

    const accountsPayable = await Account.findOne({
      accountName: vendor.displayName,
      organization: paymentmade.organization,
    });

    if (accountsPayable) {
      accountsPayable.amount += Number(paymentmade.amountPaid);
      await accountsPayable.save();
    }

    await Account.findOneAndUpdate(
      {
        _id: paymentmade.paidThrough,
      },
      {
        $inc: {
          amount: Number(paymentmade.amountPaid),
        },
      }
    );

    const organization = await Organization.findById(
      paymentmade.organization
    ).select('isAccrualAccounting');

    if (!organization.isAccrualAccounting) {
      await Account.findByIdAndUpdate(paymentmade.expenseAccount, {
        $inc: {
          amount: -Number(paymentmade.amountPaid),
        },
      });
    }

    if (paymentmade.costCenter && paymentmade.costCenter !== '') {
      await CostCenter.findByIdAndUpdate(
        paymentmade.costCenter,
        {
          $pull: {
            expense: {
              purchaseId: paymentmade.id,
              amount: Number(paymentmade.amountPaid),
              account: paymentmade.paidThrough,
              date: paymentmade.paymentDate,
            },
          },
          $inc: {
            totalExpense: -Number(paymentmade.amountPaid),
          },
        },
        { new: true }
      );
    }

    await Transaction.deleteMany({ id: paymentmade.id });
  }

  paymentmade.approval = hasApproval ? 'rejected' : 'none';
  await paymentmade.save();

  if (!hasApproval) {
    await approvePaymentMade(paymentmade);
  }

  await createActivityLog({
    userId: req.id,
    action: 'invalidate',
    type: 'paymentmade',
    actionId: paymentmade.id,
    organization: paymentmade.organization,
    company: paymentmade.company,
  });

  res.status(201).json({
    success: true,
    message: 'Payment Made invalidated successfully',
    data: paymentmade,
  });
});

const getFilteredPaymentMade = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
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
    sort_by = 'paymentDate',
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

  if (filter_status) {
    query.approval = filter_status;
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
    query.paymentDate = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'vendor', select: 'displayName currency' },
      { path: 'billsData.billNo', select: 'id' },
      { path: 'billsData.purchaseOrder', select: 'id' },
      { path: 'purchaseOrderId', select: 'id' },
    ],
  };

  const result = await PaymentMade.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Payment Made fetched successfully',
    data: {
      paymentsMade: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalPaymentsMades: result.totalDocs,
    },
  });
});

const getFilteredPaymentMadeAgent = asyncHandler(async (req, res) => {
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
    sort_by = 'paymentDate',
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
    query.paymentDate = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'vendor', select: 'displayName currency' },
      { path: 'billsData.billNo', select: 'id' },
      { path: 'billsData.purchaseOrder', select: 'id' },
      { path: 'purchaseOrderId', select: 'id' },
    ],
  };

  const result = await PaymentMade.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Payment Made fetched successfully',
    data: {
      paymentsMade: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalPaymentsMades: result.totalDocs,
    },
  });
});

const deletePaymentMade = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const paymentMade = await PaymentMade.findByIdAndDelete(id);
  res.status(200).json(paymentMade);
});

module.exports = {
  createPartialPaymentMade,
  createPaymentMade,
  updatePaymentMade,
  revisePaymentMade,
  getPaymentMadeByAgent,
  getAllPaymentMade,
  getPaymentMadeById,
  approvePaymentMadeStatus,
  rejectPaymentMade,
  updateApproval,
  invalidatePaymentMade,
  getFilteredPaymentMade,
  getFilteredPaymentMadeAgent,
  deletePaymentMade,
};
