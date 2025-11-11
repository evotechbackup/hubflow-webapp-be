const PurchaseOrder = require('../../models/procurement/PurchaseOrder');
const LastInsertedId = require('../../models/master/LastInsertedID');
const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
const Bill = require('../../models/procurement/Bills');
const RFQ = require('../../models/procurement/RFQ');
const RFP = require('../../models/procurement/RFP');
const PurchaseReceived = require('../../models/procurement/PurchaseReceive');
const mongoose = require('mongoose');
const PaymentMade = require('../../models/procurement/PaymentMade');
const Vendors = require('../../models/procurement/Vendor');
const CostCenter = require('../../models/accounts/CostCenter');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../utils/approvalUtils');
// const InventoryFleet = require('../../models/fleets/InventoryFleet');
const { asyncHandler } = require('../../middleware/errorHandler');
const {
  NotFoundError,
  ValidationError,
  ServerError,
} = require('../../utils/errors');
const { createActivityLog } = require('../../utils/logUtils');
const Shipment = require('../../models/operations/Shipment');
const Jobs = require('../../models/operations/Jobs');

const approvePurchaseOrder = async (updatedPurchaseOrder, session) => {
  let totalItemsVat = 0;

  const vendor = await Vendors.findById(updatedPurchaseOrder.vendor).select(
    'displayName'
  );

  for (const item of updatedPurchaseOrder.items) {
    totalItemsVat += item.price * (item.discount / 100) * item.quantity;

    const updateAccount = await Account.findOne({
      _id: item?.purchaseAccount,
    }).session(session);
    if (updateAccount !== null) {
      updateAccount.amount +=
        (Number(item.price) +
          (Number(item.price) * Number(item.discount || 0)) / 100) *
        Number(item.quantity);
      await updateAccount.save({ session });

      const transaction = new Transaction({
        product: item.type === 'product' ? item.itemId : null,
        service: item.type === 'item' ? item.itemsId : null,
        type: 'purchase',
        account: item?.purchaseAccount || null,
        purchaseOrder: updatedPurchaseOrder._id,
        reference: updatedPurchaseOrder.id,
        id: vendor?.displayName || '',
        vendor: updatedPurchaseOrder.vendor,
        debit: Number(
          (Number(item.price) +
            (Number(item.price) * Number(item.discount || 0)) / 100) *
            Number(item.quantity)
        ),
        runningBalance: updateAccount?.amount,
        organization: updatedPurchaseOrder.organization,
        company: updatedPurchaseOrder.company,
      });
      await transaction.save({ session });

      // if (item.type === 'product') {
      //   await Product.updateOne(
      //     { _id: item.itemId },
      //     {
      //       $inc: {
      //         quantityToBeReceived: Number(item.quantity),
      //       },
      //     },
      //     { session }
      //   );
      // } else if (item.type === 'fleet') {
      //   await InventoryFleet.updateOne(
      //     { _id: item.fleetId },
      //     {
      //       $inc: {
      //         quantityToBeReceived: Number(item.quantity),
      //       },
      //     },
      //     { session }
      //   );
      // }
    }

    const purchaseOrderAccountName =
      updatedPurchaseOrder.newProductCategory === 'materials'
        ? 'Material Purchase'
        : updatedPurchaseOrder.newProductCategory === 'consumables'
          ? 'Consumable Purchase'
          : 'Equipment Purchase';

    const purchaseInvoice = await Account.findOne({
      accountName: purchaseOrderAccountName,
      organization: updatedPurchaseOrder.organization,
    }).session(session);
    purchaseInvoice.amount += Number(updatedPurchaseOrder.subtotal);
    await purchaseInvoice.save({ session });

    const transaction2 = new Transaction({
      account: purchaseInvoice._id,
      type: 'purchase',
      purchaseOrder: updatedPurchaseOrder._id,
      vendor: updatedPurchaseOrder.vendor,
      reference: updatedPurchaseOrder.id,
      id: vendor?.displayName || '',
      debit: Number(updatedPurchaseOrder.subtotal),
      runningBalance: purchaseInvoice?.amount,
      organization: updatedPurchaseOrder.organization,
      company: updatedPurchaseOrder.company,
    });
    await transaction2.save({ session });

    if (updatedPurchaseOrder.tax !== 0 || totalItemsVat > 0) {
      const vatAccount = await Account.findOne({
        accountName: 'Input VAT',
        organization: updatedPurchaseOrder.organization,
      }).session(session);
      vatAccount.amount +=
        (updatedPurchaseOrder.tax !== 0
          ? Number(updatedPurchaseOrder.subtotal) *
            Number(updatedPurchaseOrder.tax / 100)
          : 0) + totalItemsVat;
      await vatAccount.save({ session });

      const transaction2 = new Transaction({
        account: vatAccount._id,
        type: 'purchase',
        purchaseOrder: updatedPurchaseOrder._id,
        vendor: updatedPurchaseOrder.vendor,
        reference: updatedPurchaseOrder.id,
        id: vendor?.displayName || '',
        debit:
          updatedPurchaseOrder.tax !== 0
            ? Number(updatedPurchaseOrder.subtotal) *
              Number(updatedPurchaseOrder.tax / 100)
            : 0 + totalItemsVat,
        runningBalance: vatAccount?.amount,
        organization: updatedPurchaseOrder.organization,
        company: updatedPurchaseOrder.company,
      });
      await transaction2.save({ session });
    }

    if (
      updatedPurchaseOrder.costCenter &&
      updatedPurchaseOrder.costCenter !== ''
    ) {
      await CostCenter.findByIdAndUpdate(
        updatedPurchaseOrder.costCenter,
        {
          $push: {
            expense: {
              purchase: updatedPurchaseOrder._id,
              purchaseId: updatedPurchaseOrder.id,
              amount: Number(updatedPurchaseOrder.total),
              account: purchaseInvoice?._id || null,
              date: updatedPurchaseOrder.createdAt,
            },
          },
          $inc: {
            totalExpense: Number(updatedPurchaseOrder.total),
          },
        },
        { new: true, session }
      );
    }
  }
};

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id, customID, organization } = req.body;
    let lastInsertedId = await LastInsertedId.findOne({
      entity: 'purchaseQuotation',
      organization,
    }).session(session);
    if (!lastInsertedId) {
      lastInsertedId = new LastInsertedId({
        entity: 'purchaseQuotation',
        organization,
      });
    }
    if (id !== undefined && !isNaN(parseInt(id))) {
      lastInsertedId.lastId = parseInt(id);
      await lastInsertedId.save({ session });
    } else {
      lastInsertedId.lastId += 1;
      await lastInsertedId.save({ session });
    }
    const { prefix } = req.body;
    const purchaseQuotationPrefix = prefix || lastInsertedId.prefix || '';
    if (prefix) {
      lastInsertedId.prefix = prefix;
      await lastInsertedId.save({ session });
    }
    const {
      items,
      vendor,
      reference,
      date,
      expectedDeliveryDate,
      paymentTerms,
      freightCharges,
      discount,
      incoTerms,
      shipmentPreferences,
      notes,
      total,
      subtotal,
      tax,
      termsCondition,
      document,
      company,
      docAttached = '',
      contactPerson,
      itemsFromInventory,
      newProductCategory,
      dueDate,
      costCenter,
      inspectionRequired,
      advancePayment,
      balance,
      priorityStatus,
      subject,
      referenceDate,
      rfpId,
      job,
    } = req.body;

    const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

    const hasApproval = await ifHasApproval('purchaseorder', organization);

    const newQuotation = new PurchaseOrder({
      items,
      vendor,
      id: customID ? customID : purchaseQuotationPrefix + paddedId,
      reference,
      date,
      expectedDeliveryDate,
      paymentTerms,
      incoTerms,
      freightCharges,
      discount,
      shipmentPreferences,
      notes,
      total,
      subtotal,
      tax,
      termsCondition,
      document,
      company,
      organization,
      agent: req.id,
      docAttached,
      contactPerson,
      dueDate,
      costCenter,
      inspectionRequired,
      advancePayment,
      balance,
      newProductCategory,
      itemsFromInventory,
      priorityStatus,
      subject,
      referenceDate,
      rfpId,
      job,
    });
    const savedQuotation = await newQuotation.save({ session });

    if (rfpId) {
      await RFP.findByIdAndUpdate(rfpId, {
        $set: {
          poCreated: true,
        },
      });
    }

    if (job && vendor) {
      const shipments = await Shipment.find({
        jobId: job,
        valid: true,
      });

      const bulkOps = [];

      for (const shipment of shipments) {
        const updatedItems = shipment.items.map((item) => {
          if (
            item.vendor.toString() === vendor.toString() &&
            !item.purchaseRef
          ) {
            const poIndex = savedQuotation.items.findIndex(
              (i) => i.productName.toString() === item.productName.toString()
            );

            if (poIndex !== -1) {
              return {
                ...item.toObject(),
                purchaseId: savedQuotation.id,
                purchaseRef: savedQuotation._id,
                purchaseAmount: savedQuotation.items[poIndex].amount,
              };
            }
          }
          return item;
        });

        if (JSON.stringify(updatedItems) !== JSON.stringify(shipment.items)) {
          bulkOps.push({
            updateOne: {
              filter: { _id: shipment._id },
              update: { $set: { items: updatedItems } },
            },
          });
        }
      }

      if (bulkOps.length > 0) {
        await Shipment.bulkWrite(bulkOps);
      }
    }

    if (savedQuotation.organization && savedQuotation.company) {
      await createActivityLog({
        userId: req.id,
        action: 'create',
        type: 'purchaseorder',
        actionId: savedQuotation.id,
        organization: savedQuotation.organization,
        company: savedQuotation.company,
      });
    }

    if (!hasApproval) {
      await approvePurchaseOrder(savedQuotation, session);
    }

    // Generate embedding for the vendor
    // try {
    //   const vendor = await Vendors.findById(savedQuotation.vendor);
    //   if (vendor) {
    //     await vendor.generateEmbedding();
    //   }
    // } catch (error) {
    //   console.error('Error generating embedding for vendor:', error);
    // }

    await session.commitTransaction();

    // Send notifications after transaction is committed
    if (hasApproval) {
      try {
        await findNextApprovalLevelAndNotify(
          'purchaseorder',
          'pending',
          savedQuotation.organization,
          savedQuotation.company,
          savedQuotation.id,
          'Purchase Order',
          'purchaseOrder',
          savedQuotation._id
        );
      } catch (error) {
        console.error('Error sending approval notifications:', error);
        // Don't fail the request if notifications fail
      }
    }

    res.status(201).json({
      success: true,
      message: 'Purchase Order created successfully',
      data: savedQuotation,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error creating invoice:', error);
    throw new ServerError(error.message);
  } finally {
    session.endSession();
  }
});

const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { poId } = req.params;
    const {
      items,
      id,
      vendor,
      reference,
      date,
      expectedDeliveryDate,
      paymentTerms,
      incoTerms,
      shipmentPreferences,
      notes,
      total,
      subtotal,
      freightCharges,
      discount,
      tax,
      termsCondition,
      document,
      company,
      organization,
      docAttached,
      contactPerson,
      dueDate,
      costCenter,
      advancePayment,
      balance,
      subject,
      referenceDate,
      rfpId,
      order,
    } = req.body;

    // Find the existing quotation
    const existingQuotation =
      await PurchaseOrder.findById(poId).session(session);

    if (!existingQuotation) {
      await session.abortTransaction();
      throw new NotFoundError('Purchase quotation not found');
    }

    // Revert account changes and product quantities for existing items
    if (
      existingQuotation.approval === 'approved1' ||
      existingQuotation.approval === 'approved2' ||
      existingQuotation.approval === 'none'
    ) {
      const revertPromises = existingQuotation.items.map(async (item) => {
        // if (item.type === 'product') {
        //   await Product.updateOne(
        //     { _id: item.itemId },
        //     { $inc: { quantityToBeReceived: -Number(item.quantity) } },
        //     { session }
        //   );
        // } else if (item.type === 'fleet') {
        //   await InventoryFleet.updateOne(
        //     { _id: item.fleetId },
        //     { $inc: { quantityToBeReceived: -Number(item.quantity) } },
        //     { session }
        //   );
        // }

        if (item.purchaseAccount) {
          await Account.updateOne(
            { _id: item.purchaseAccount },
            {
              $inc: {
                amount: -(
                  Number(
                    item.price + (item.price * Number(item.discount)) / 100
                  ) * Number(item.quantity)
                ),
              },
            },
            { session }
          );
        }
      });

      // Revert discount account
      const VatToRevert = existingQuotation.items.reduce(
        (acc, item) => acc + item.price * (item.discount / 100) * item.quantity,
        0
      );

      // Revert product purchase account
      const purchaseOrderAccountName =
        existingQuotation.newProductCategory === 'materials'
          ? 'Material Purchase'
          : existingQuotation.newProductCategory === 'consumables'
            ? 'Consumable Purchase'
            : 'Equipment Purchase';

      await Account.updateOne(
        { accountName: purchaseOrderAccountName, organization },
        { $inc: { amount: -Number(existingQuotation.subtotal) } },
        { session }
      );

      // Revert VAT account if applicable
      if (existingQuotation.tax !== 0 || VatToRevert > 0) {
        await Account.updateOne(
          { accountName: 'Input VAT', organization },
          {
            $inc: {
              amount: -(
                VatToRevert +
                (existingQuotation.tax !== 0
                  ? Number(existingQuotation.subtotal) *
                    Number(existingQuotation.tax / 100)
                  : 0)
              ),
            },
          },
          { session }
        );
      }

      await Promise.all(revertPromises);

      // Delete existing transactions for this quotation
      await Transaction.deleteMany(
        { purchaseOrder: existingQuotation._id },
        { session }
      );
    }

    const prevTotal = existingQuotation.total;
    const prevCostCenter = existingQuotation?.costCenter || null;

    const hasApproval = await ifHasApproval('purchaseorder', organization);

    // Update the quotation fields
    Object.assign(existingQuotation, {
      items,
      id,
      vendor,
      reference,
      date,
      expectedDeliveryDate,
      paymentTerms,
      incoTerms,
      freightCharges,
      discount,
      shipmentPreferences,
      notes,
      total,
      subtotal,
      tax,
      termsCondition,
      document,
      company,
      organization,
      user: req.id,
      docAttached,
      contactPerson,
      dueDate,
      costCenter,
      advancePayment,
      balance,
      subject,
      referenceDate,
      rfpId,
      order,
      approval: hasApproval ? 'pending' : 'none',
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
    });

    // Save the updated quotation
    const updatedQuotation = await existingQuotation.save({ session });

    if (
      existingQuotation.approval === 'approved1' ||
      existingQuotation.approval === 'approved2' ||
      existingQuotation.approval === 'none'
    ) {
      const existingCostCenter = await CostCenter.findById(prevCostCenter);

      if (existingCostCenter) {
        existingCostCenter.expense = existingCostCenter.expense.filter(
          (expense) => {
            return (
              expense.purchase.toString() !== existingQuotation._id.toString()
            );
          }
        );
        existingCostCenter.totalExpense -= prevTotal;
        await existingCostCenter.save({ session });
      }
    }

    if (!hasApproval) {
      await approvePurchaseOrder(updatedQuotation, session);
    }

    if (updatedQuotation.organization && updatedQuotation.company) {
      await createActivityLog({
        userId: req.id,
        action: 'update',
        type: 'purchaseorder',
        actionId: updatedQuotation.id,
        organization: updatedQuotation.organization,
        company: updatedQuotation.company,
      });
    }

    // Generate embedding for the vendor
    // try {
    //   const vendor = await Vendors.findById(updatedQuotation.vendor);
    //   if (vendor) {
    //     await vendor.generateEmbedding();
    //   }
    // } catch (error) {
    //   console.error('Error generating embedding for vendor:', error);
    // }

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: 'Purchase quotation updated successfully',
      data: updatedQuotation,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating purchase quotation:', error);
    throw new ServerError('Error updating purchase quotation');
  } finally {
    session.endSession();
  }
});

const revisedPurchaseOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { poId } = req.params;
    const {
      items,
      vendor,
      reference,
      date,
      expectedDeliveryDate,
      paymentTerms,
      incoTerms,
      shipmentPreferences,
      notes,
      total,
      subtotal,
      freightCharges,
      discount,
      tax,
      termsCondition,
      document,
      company,
      organization,
      docAttached,
      contactPerson,
      dueDate,
      costCenter,
      advancePayment,
      balance,
      subject,
      referenceDate,
      rfpId,
      order,
    } = req.body;

    // Find the existing quotation
    const existingQuotation =
      await PurchaseOrder.findById(poId).session(session);

    const baseId = existingQuotation.id.split('-REV')[0];
    const currentRevision = existingQuotation.id.includes('-REV')
      ? parseInt(existingQuotation.id.split('-REV')[1])
      : 0;

    const newRevision = currentRevision + 1;

    const newId = `${baseId}-REV${newRevision}`;

    if (!existingQuotation) {
      await session.abortTransaction();
      throw new NotFoundError('Purchase quotation not found');
    }

    // Revert account changes and product quantities for existing items
    if (
      existingQuotation.approval === 'approved1' ||
      existingQuotation.approval === 'approved2' ||
      existingQuotation.approval === 'none'
    ) {
      const revertPromises = existingQuotation.items.map(async (item) => {
        // if (item.type === 'product') {
        //   await Product.updateOne(
        //     { _id: item.itemId },
        //     { $inc: { quantityToBeReceived: -Number(item.quantity) } },
        //     { session }
        //   );
        // } else if (item.type === 'fleet') {
        //   await InventoryFleet.updateOne(
        //     { _id: item.fleetId },
        //     { $inc: { quantityToBeReceived: -Number(item.quantity) } },
        //     { session }
        //   );
        // }

        if (item.purchaseAccount) {
          await Account.updateOne(
            {
              _id: item.purchaseAccount,
            },
            {
              $inc: {
                amount: -(
                  Number(
                    item.price + (item.price * Number(item.discount)) / 100
                  ) * Number(item.quantity)
                ),
              },
            },
            { session }
          );
        }
      });

      // Revert discount account
      const VatToRevert = existingQuotation.items.reduce(
        (acc, item) => acc + item.price * (item.discount / 100) * item.quantity,
        0
      );

      // Revert product purchase account
      const purchaseOrderAccountName =
        existingQuotation.newProductCategory === 'materials'
          ? 'Material Purchase'
          : existingQuotation.newProductCategory === 'consumables'
            ? 'Consumable Purchase'
            : 'Equipment Purchase';

      await Account.updateOne(
        { accountName: purchaseOrderAccountName, organization },
        { $inc: { amount: -Number(existingQuotation.subtotal) } },
        { session }
      );

      // Revert VAT account if applicable
      if (existingQuotation.tax !== 0 || VatToRevert > 0) {
        await Account.updateOne(
          { accountName: 'Input VAT', organization },
          {
            $inc: {
              amount: -(
                VatToRevert +
                (existingQuotation.tax !== 0
                  ? Number(existingQuotation.subtotal) *
                    Number(existingQuotation.tax / 100)
                  : 0)
              ),
            },
          },
          { session }
        );
      }

      await Promise.all(revertPromises);

      // Delete existing transactions for this quotation
      await Transaction.deleteMany({
        purchaseOrder: existingQuotation._id,
      }).session(session);
    }

    const prevTotal = existingQuotation.total;
    const prevCostCenter = existingQuotation?.costCenter || null;

    const hasApproval = await ifHasApproval('purchaseorder', organization);

    // Update the quotation fields
    Object.assign(existingQuotation, {
      items,
      id: newId,
      vendor,
      reference,
      date,
      expectedDeliveryDate,
      paymentTerms,
      incoTerms,
      freightCharges,
      discount,
      shipmentPreferences,
      notes,
      total,
      subtotal,
      tax,
      termsCondition,
      document,
      company,
      organization,
      user: req.id,
      docAttached,
      contactPerson,
      dueDate,
      costCenter,
      advancePayment,
      balance,
      subject,
      referenceDate,
      rfpId,
      order,
      approval: hasApproval ? 'pending' : 'none',
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
    });

    // Save the updated quotation
    const updatedQuotation = await existingQuotation.save({ session });

    if (
      existingQuotation.approval === 'approved1' ||
      existingQuotation.approval === 'approved2' ||
      existingQuotation.approval === 'none'
    ) {
      const existingCostCenter = await CostCenter.findById(prevCostCenter);

      if (existingCostCenter) {
        existingCostCenter.expense = existingCostCenter.expense.filter(
          (expense) => {
            return (
              expense.purchase.toString() !== updatedQuotation._id.toString()
            );
          }
        );
        existingCostCenter.totalExpense -= prevTotal;
        await existingCostCenter.save({ session });
      }
    }

    if (!hasApproval) {
      await approvePurchaseOrder(updatedQuotation, session);
    }

    if (updatedQuotation.organization && updatedQuotation.company) {
      await createActivityLog({
        userId: req.id,
        action: 'update',
        type: 'purchaseorder',
        actionId: updatedQuotation.id,
        organization: updatedQuotation.organization,
        company: updatedQuotation.company,
      });
    }

    // Generate embedding for the vendor
    // try {
    //   const vendor = await Vendors.findById(updatedQuotation.vendor);
    //   if (vendor) {
    //     await vendor.generateEmbedding();
    //   }
    // } catch (error) {
    //   console.error('Error generating embedding for vendor:', error);
    // }

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: 'Purchase quotation updated successfully',
      data: updatedQuotation,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating purchase quotation:', error);
    throw new ServerError('Internal Server Error');
  } finally {
    session.endSession();
  }
});

const getPurchaseOrdersByAgent = asyncHandler(async (req, res) => {
  const purchasequotations = await PurchaseOrder.find({
    user: req.id,
  }).populate('vendor');
  res.json({
    success: true,
    message: 'Purchase quotations fetched successfully',
    data: purchasequotations,
  });
});

const getPurchaseOrdersByOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const quotations = await PurchaseOrder.find({
    organization: orgid,
  }).populate('vendor');
  const quotationsWithBills = await Promise.all(
    quotations.map(async (quotation) => {
      const associatedReceivedData = await PurchaseReceived.findOne({
        purchaseOrder: quotation._id,
      });

      const associatedBill = associatedReceivedData
        ? await Bill.findOne({ orderNo: associatedReceivedData._id })
        : null;

      return {
        ...quotation.toObject(),
        associatedBill: associatedBill || null,
        associatedPurchaseReceive: associatedReceivedData || null,
      };
    })
  );

  res.json({
    success: true,
    message: 'Purchase quotations fetched successfully',
    data: quotationsWithBills,
  });
});

const getPurchaseOrdersLength = asyncHandler(async (req, res) => {
  const quotationCount = await PurchaseOrder.countDocuments();
  res.json({
    success: true,
    message: 'Purchase quotations fetched successfully',
    data: quotationCount,
  });
});

const getPurchaseOrdersById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const quotations = await PurchaseOrder.findById(id)
    .populate('vendor')
    .populate('items.itemId')
    .populate('items.itemsId')
    .populate('items.fleetId')
    .populate('company')
    .populate('user', ['signature', 'fullName', 'email', 'phone', 'role'])
    .populate('verifiedBy', ['signature', 'fullName', 'email', 'phone', 'role'])
    .populate('reviewedBy', ['signature', 'fullName', 'email', 'phone', 'role'])
    .populate('approvedBy1', [
      'signature',
      'fullName',
      'email',
      'phone',
      'role',
    ])
    .populate('approvedBy2', [
      'signature',
      'fullName',
      'email',
      'phone',
      'role',
    ])
    .populate('organization');

  const associatedReceivedData = await PurchaseReceived.findOne({
    purchaseOrder: id,
  });
  const associatedBill = await Bill.findOne({
    poNo: id,
  }).populate('vendor');

  const quotationsWithBills = {
    ...quotations?.toObject(),
    associatedBill: associatedBill || null,
    associatedPurchaseReceive: associatedReceivedData || null,
  };

  res.json({
    success: true,
    message: 'Purchase quotation fetched successfully',
    data: quotationsWithBills,
  });
});

const getPurchaseOrderDetailsByOrganization = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate, search_query = '' } = req.query;

  const start =
    startDate && startDate !== 'null' && startDate !== 'undefined'
      ? new Date(new Date(startDate).setHours(0, 0, 0, 0))
      : new Date(0);
  const end =
    endDate && endDate !== 'null' && endDate !== 'undefined'
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : new Date();

  const matchCondition = {
    organization: new mongoose.Types.ObjectId(orgid),
    valid: true,
    date: { $gt: start, $lt: end },
  };

  if (search_query && search_query !== 'null' && search_query !== '') {
    matchCondition.$or = [
      { id: { $regex: search_query, $options: 'i' } },
      { 'items.productName': { $regex: search_query, $options: 'i' } },
    ];
  }

  const result = await PurchaseOrder.aggregate([
    { $match: matchCondition },
    {
      $lookup: {
        from: 'vendors',
        localField: 'vendor',
        foreignField: '_id',
        as: 'vendor',
        pipeline: [{ $project: { displayName: 1 } }],
      },
    },
    { $sort: { date: -1 } },
    { $unwind: '$vendor' },
    { $unwind: '$items' },
    {
      $project: {
        vendor: '$vendor.displayName',
        item: '$items.productName',
        quantity: '$items.quantity',
        price: '$items.price',
        amount: '$items.amount',
        id: 1,
        date: 1,
        status: 1,
      },
    },
  ]);

  if (search_query && search_query !== 'null' && search_query !== '') {
    const filtered = result.filter(
      (item) =>
        item.id?.toLowerCase().includes(search_query.toLowerCase()) ||
        item.item?.toLowerCase().includes(search_query.toLowerCase())
    );
    return res.status(200).json({
      success: true,
      message: 'Purchase Order details fetched successfully',
      data: filtered,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Purchase Order details fetched successfully',
    data: result,
  });
});

const purchaseOrderApprove = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { approval } = req.body;

    const purchaseorder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseorder) {
      throw new NotFoundError('Purchase Order not found');
    }

    const oldApproval = purchaseorder.approval;

    purchaseorder.approval = approval;
    if (approval === 'approved1') {
      purchaseorder.approvedBy1 = req.id;
      purchaseorder.approvedAt1 = new Date();
    } else if (approval === 'approved2') {
      purchaseorder.approvedBy2 = req.id;
      purchaseorder.approvedAt2 = new Date();
    }

    const updatedPurchaseOrder = await purchaseorder.save({ session });

    if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
      await approvePurchaseOrder(updatedPurchaseOrder, session);

      if (approval === 'approved1') {
        await findNextApprovalLevelAndNotify(
          'purchaseorder',
          approval,
          updatedPurchaseOrder.organization,
          updatedPurchaseOrder.company,
          updatedPurchaseOrder.id,
          'Purchase Order',
          'purchaseOrder',
          updatedPurchaseOrder._id
        );
      }

      if (updatedPurchaseOrder.organization && updatedPurchaseOrder.company) {
        await createActivityLog({
          userId: req.id,
          action: 'approve',
          type: 'purchaseorder',
          actionId: updatedPurchaseOrder.id,
          organization: updatedPurchaseOrder.organization,
          company: updatedPurchaseOrder.company,
        });
      }
    }

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: 'Purchase Order approved successfully',
      data: updatedPurchaseOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    throw new ServerError('Internal Server Error');
  } finally {
    session.endSession();
  }
});

const purchaseOrderReject = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { approvalComment } = req.body;
    const updatedPurchaseOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id },
      {
        approval: 'rejected',
        approvalComment: approvalComment || null,
        approvedAt1: null,
        approvedBy1: null,
        approvedAt2: null,
        approvedBy2: null,
        verifiedAt: null,
        verifiedBy: null,
        reviewedAt: null,
        reviewedBy: null,
        acknowledgedAt: null,
        acknowledgedBy: null,
      },
      { session }
    );

    if (
      updatedPurchaseOrder.approval === 'approved1' ||
      updatedPurchaseOrder.approval === 'approved2'
    ) {
      {
        let totalItemsVat = 0;

        for (const item of updatedPurchaseOrder.items) {
          totalItemsVat += item.price * (item.discount / 100) * item.quantity;

          // if (item.type === 'product') {
          //   await Product.updateOne(
          //     { _id: item.itemId },
          //     {
          //       $inc: {
          //         quantityToBeReceived: -Number(item.quantity),
          //       },
          //     },
          //     { session }
          //   );
          // } else if (item.type === 'fleet') {
          //   await InventoryFleet.updateOne(
          //     { _id: item.fleetId },
          //     {
          //       $inc: {
          //         quantityToBeReceived: -Number(item.quantity),
          //       },
          //     },
          //     { session }
          //   );
          // }
        }

        const purchaseOrderAccountName =
          updatedPurchaseOrder.newProductCategory === 'materials'
            ? 'Material Purchase'
            : updatedPurchaseOrder.newProductCategory === 'consumables'
              ? 'Consumable Purchase'
              : 'Equipment Purchase';

        const purchaseInvoice = await Account.findOne({
          accountName: purchaseOrderAccountName,
          organization: updatedPurchaseOrder.organization,
        }).session(session);
        purchaseInvoice.amount -= Number(updatedPurchaseOrder.subtotal);
        await purchaseInvoice.save({ session });

        if (updatedPurchaseOrder.tax !== 0 || totalItemsVat > 0) {
          const vatAccount = await Account.findOne({
            accountName: 'Input VAT',
            organization: updatedPurchaseOrder.organization,
          }).session(session);
          vatAccount.amount -=
            (updatedPurchaseOrder.tax !== 0
              ? Number(updatedPurchaseOrder.subtotal) *
                Number(updatedPurchaseOrder.tax / 100)
              : 0) + totalItemsVat;
          await vatAccount.save({ session });
        }

        const account = await Account.findOne({
          accountName: 'Product Purchase',
          organization: updatedPurchaseOrder.organization,
        }).session(session);

        if (
          account !== null &&
          updatedPurchaseOrder.costCenter &&
          updatedPurchaseOrder.costCenter !== ''
        ) {
          await CostCenter.findByIdAndUpdate(
            updatedPurchaseOrder.costCenter,
            {
              $pull: {
                expense: {
                  purchase: updatedPurchaseOrder._id,
                  purchaseId: updatedPurchaseOrder.id,
                  amount: Number(updatedPurchaseOrder.total),
                  account: account._id,
                  date: updatedPurchaseOrder.createdAt,
                },
              },
              $inc: {
                totalExpense: -Number(updatedPurchaseOrder.total),
              },
            },
            { new: true, session }
          );
        }

        await Transaction.deleteMany(
          { purchaseOrder: updatedPurchaseOrder._id },
          { session }
        );
      }
    }

    if (updatedPurchaseOrder.organization && updatedPurchaseOrder.company) {
      await createActivityLog({
        userId: req.id,
        action: 'reject',
        type: 'purchaseorder',
        actionId: updatedPurchaseOrder.id,
        organization: updatedPurchaseOrder.organization,
        company: updatedPurchaseOrder.company,
      });
    }
    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: 'Purchase Order rejected successfully',
      data: updatedPurchaseOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    throw new ServerError('Internal Server Error');
  } finally {
    session.endSession();
  }
});

const purchaseOrderUpdateApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;

  const po = await PurchaseOrder.findById(id);

  if (!po) {
    throw new NotFoundError('Purchase Order not found');
  }

  const resetFields = () => {
    po.verifiedBy = null;
    po.approvedBy1 = null;
    po.approvedBy2 = null;
    po.verifiedAt = null;
    po.approvedAt1 = null;
    po.approvedAt2 = null;
    po.reviewedBy = null;
    po.reviewedAt = null;
    po.acknowledgedBy = null;
    po.acknowledgedAt = null;
  };

  po.approval = approval;
  switch (approval) {
    case 'reviewed':
      po.reviewedBy = req.id || null;
      po.reviewedAt = new Date();
      po.verifiedBy = null;
      po.verifiedAt = null;
      po.acknowledgedBy = null;
      po.acknowledgedAt = null;
      break;
    case 'verified':
      po.verifiedBy = req.id || null;
      po.verifiedAt = new Date();
      po.acknowledgedBy = null;
      po.acknowledgedAt = null;
      break;
    case 'acknowledged':
      po.acknowledgedBy = req.id || null;
      po.acknowledgedAt = new Date();
      break;
    case 'correction':
      po.approvalComment = approvalComment || null;
      resetFields();
      break;
    default:
      break;
  }
  const updatedPurchaseOrder = await po.save();

  await findNextApprovalLevelAndNotify(
    'purchaseorder',
    approval,
    updatedPurchaseOrder.organization,
    updatedPurchaseOrder.company,
    updatedPurchaseOrder.id,
    'Purchase Order',
    'purchaseOrder',
    updatedPurchaseOrder._id
  );

  if (updatedPurchaseOrder.organization && updatedPurchaseOrder.company) {
    await createActivityLog({
      userId: req.id,
      action: approval,
      type: 'purchaseorder',
      actionId: updatedPurchaseOrder.id,
      organization: updatedPurchaseOrder.organization,
      company: updatedPurchaseOrder.company,
    });
  }
  res.status(201).json({
    success: true,
    message: 'Purchase Order updated successfully',
    data: updatedPurchaseOrder,
  });
});

const purchaseOrderInvalidate = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const purchaseorder = await PurchaseOrder.findByIdAndUpdate(
      id,
      {
        $set: {
          valid: false,
          approvedAt1: null,
          approvedBy1: null,
          approvedAt2: null,
          approvedBy2: null,
          verifiedAt: null,
          verifiedBy: null,
          reviewedAt: null,
          reviewedBy: null,
          acknowledgedAt: null,
          acknowledgedBy: null,
        },
      },
      { session }
    );

    const hasApproval = await ifHasApproval(
      'purchaseorder',
      purchaseorder.organization
    );

    // Revert account changes and product quantities for existing items
    if (
      purchaseorder.approval === 'approved1' ||
      purchaseorder.approval === 'approved2' ||
      purchaseorder.approval === 'none'
    ) {
      const revertPromises = purchaseorder.items.map(async (item) => {
        // if (item.type === 'product') {
        //   await Product.updateOne(
        //     { _id: item.itemId },
        //     { $inc: { quantityToBeReceived: -Number(item.quantity) } },
        //     { session }
        //   );
        // } else if (item.type === 'fleet') {
        //   await InventoryFleet.updateOne(
        //     { _id: item.fleetId },
        //     { $inc: { quantityToBeReceived: -Number(item.quantity) } },
        //     { session }
        //   );
        // }

        if (item.purchaseAccount) {
          await Account.updateOne(
            { _id: item.purchaseAccount },
            {
              $inc: {
                amount: -(
                  Number(item.price + item.price * (item.discount / 100)) *
                  item.quantity
                ),
              },
            },
            { session }
          );
        }
      });

      // Revert discount account
      const discountVATToRevert = purchaseorder.items.reduce(
        (acc, item) =>
          acc +
          (item.price + item.price * (item.discount / 100)) * item.quantity,
        0
      );

      // Revert product purchase account
      const purchaseOrderAccountName =
        purchaseorder.newProductCategory === 'materials'
          ? 'Material Purchase'
          : purchaseorder.newProductCategory === 'consumables'
            ? 'Consumable Purchase'
            : 'Equipment Purchase';

      await Account.updateOne(
        {
          accountName: purchaseOrderAccountName,
          organization: purchaseorder.organization,
        },
        { $inc: { amount: -Number(purchaseorder.subtotal) } },
        { session }
      );

      // Revert VAT account if applicable
      if (purchaseorder.tax !== 0 || discountVATToRevert > 0) {
        await Account.updateOne(
          {
            accountName: 'Input VAT',
            organization: purchaseorder.organization,
          },
          {
            $inc: {
              amount: -(
                Number(discountVATToRevert) +
                (purchaseorder.tax !== 0
                  ? Number(purchaseorder.subtotal) *
                    Number(purchaseorder.tax / 100)
                  : 0)
              ),
            },
          },
          { session }
        );
      }

      await Promise.all(revertPromises);

      const account = await Account.findOne({
        accountName: 'Product Purchase',
        organization: purchaseorder.organization,
      }).session(session);

      if (
        account !== null &&
        purchaseorder.costCenter &&
        purchaseorder.costCenter !== ''
      ) {
        await CostCenter.findByIdAndUpdate(
          purchaseorder.costCenter,
          {
            $pull: {
              expense: {
                purchase: purchaseorder._id,
                purchaseId: purchaseorder.id,
                amount: Number(purchaseorder.total),
                account: account._id,
                date: purchaseorder.createdAt,
              },
            },
            $inc: {
              totalExpense: -Number(purchaseorder.total),
            },
          },
          { new: true, session }
        );
      }

      // Delete existing transactions for this quotation
      await Transaction.deleteMany({ purchaseOrder: id }, { session });
    }

    purchaseorder.approval = hasApproval ? 'rejected' : 'none';
    await purchaseorder.save();

    if (!hasApproval) {
      await approvePurchaseOrder(purchaseorder, session);
    }

    if (purchaseorder.organization && purchaseorder.company) {
      await createActivityLog({
        userId: req.id,
        action: 'invalidate',
        type: 'purchaseorder',
        actionId: purchaseorder.id,
        organization: purchaseorder.organization,
        company: purchaseorder.company,
      });
    }

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: 'Purchase Order invalidated successfully',
      data: purchaseorder,
    });
  } catch (error) {
    await session.abortTransaction();
    throw new ServerError(error.message);
  } finally {
    session.endSession();
  }
});

//filter
const getFilteredPurchaseOrders = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    filter_status,
    filter_approval,
    filter_validity,
    filter_order,
    filter_vendor,
    filter_vendorName = '',
    search_query = '',
    startDate,
    endDate,
    sort_by = 'date',
    sort_order = 'desc',
    page = 1,
    limit = 25,
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
    query.status = filter_status;
  }
  if (filter_vendor) {
    query.vendor = filter_vendor;
  }
  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_order) {
    query.order = filter_order;
  }
  if (search_query) {
    query.$or = [
      { reference: { $regex: search_query, $options: 'i' } },
      { id: { $regex: search_query, $options: 'i' } },
    ];
  }
  if (filter_vendorName) {
    const vendorIds = await Vendors.find({
      displayName: { $regex: filter_vendorName, $options: 'i' },
    }).distinct('_id');

    if (vendorIds.length > 0) {
      query.vendor = { $in: vendorIds };
    } else {
      query.vendor = null;
    }
  }
  if (
    startDate &&
    startDate !== 'undefined' &&
    startDate !== 'null' &&
    endDate &&
    endDate !== 'undefined' &&
    endDate !== 'null'
  ) {
    query.date = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'vendor', select: 'displayName currency' },
      { path: 'rfpId', select: 'id' },
    ],
  };

  const result = await PurchaseOrder.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Purchase Orders fetched successfully',
    data: {
      purchaseOrders: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalPurchaseOrders: result.totalDocs,
    },
  });
});

//filter without pagination
const getFilteredPurchaseOrdersWithoutPagination = asyncHandler(
  async (req, res) => {
    const { orgid } = req.params;
    const {
      filter_status,
      filter_approval,
      filter_validity,
      filter_order,
      filter_vendor,
      filter_vendorName = '',
      search_query = '',
      startDate,
      endDate,
      sort_by = 'date',
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
      query.status = filter_status;
    }
    if (filter_vendor) {
      query.vendor = filter_vendor;
    }
    if (filter_approval) {
      query.approval = filter_approval;
    }
    if (filter_validity) {
      query.valid = filter_validity;
    }
    if (filter_order) {
      query.order = filter_order;
    }
    if (search_query) {
      query.$or = [
        { reference: { $regex: search_query, $options: 'i' } },
        { id: { $regex: search_query, $options: 'i' } },
      ];
    }
    if (filter_vendorName) {
      const vendorIds = await Vendors.find({
        displayName: { $regex: filter_vendorName, $options: 'i' },
      }).distinct('_id');

      if (vendorIds.length > 0) {
        query.vendor = { $in: vendorIds };
      } else {
        query.vendor = null;
      }
    }
    if (
      startDate &&
      startDate !== 'undefined' &&
      startDate !== 'null' &&
      endDate &&
      endDate !== 'undefined' &&
      endDate !== 'null'
    ) {
      query.date = dateFilter;
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 })
      .select(
        'date id reference vendor order rfpId status approval valid createdAt priorityStatus total subtotal status dueDate paymentStatus'
      )
      .populate({ path: 'vendor', select: 'displayName currency' })
      .populate({ path: 'rfpId', select: 'id' });

    res.status(200).json({
      success: true,
      message: 'Purchase Orders fetched successfully',
      data: {
        purchaseOrders,
        totalPurchaseOrders: purchaseOrders.length,
      },
    });
  }
);

const getFilteredPurchaseOrdersByUser = asyncHandler(async (req, res) => {
  const {
    filter_validity,
    filter_status,
    filter_approval,
    filter_order,
    filter_vendor,
    filter_vendorName = '',
    search_query = '',
    startDate,
    endDate,
    sort_by = 'date',
    sort_order = 'desc',
    page = 1,
    limit = 25,
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
  if (filter_order) {
    query.order = filter_order;
  }
  if (filter_vendor) {
    query.vendor = filter_vendor;
  }
  if (search_query) {
    query.$or = [
      { reference: { $regex: search_query, $options: 'i' } },
      { id: { $regex: search_query, $options: 'i' } },
    ];
  }
  if (filter_vendorName) {
    const vendorIds = await Vendors.find({
      displayName: { $regex: filter_vendorName, $options: 'i' },
    }).distinct('_id');

    if (vendorIds.length > 0) {
      query.vendor = { $in: vendorIds };
    } else {
      query.vendor = null;
    }
  }
  if (
    startDate &&
    startDate !== 'undefined' &&
    startDate !== 'null' &&
    endDate &&
    endDate !== 'undefined' &&
    endDate !== 'null'
  ) {
    query.date = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'vendor', select: 'displayName currency' },
      { path: 'rfpId', select: 'id' },
    ],
  };

  const result = await PurchaseOrder.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Purchase Orders fetched successfully',
    data: {
      purchaseOrders: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalPurchaseOrders: result.totalDocs,
    },
  });
});

const getDashboardData = asyncHandler(async (req, res) => {
  const orgid = new mongoose.Types.ObjectId(req.params.orgid);

  const monthNames = [
    '',
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const buildLast12MonthsMap = (data, field = 'total') => {
    const result = {};
    for (let i = 1; i <= 12; i++) {
      result[monthNames[i]] = 0;
    }
    data.forEach((item) => {
      const month = monthNames[item._id.month];
      result[month] = item[field] || 0;
    });
    return result;
  };

  const last12MonthsDate = new Date();
  last12MonthsDate.setMonth(last12MonthsDate.getMonth() - 11);

  const [
    purchaseOrderAgg,
    purchaseOrderPayment,
    monthlyPurchaseOrders,
    purchaseReceivedCount,
    purchaseReceivedAmount,
    monthlyPurchaseReceived,
    billAgg,
    monthlyBills,
    paymentMadeAgg,
    monthlyPayments,
    rfqAgg,
    monthlyRFQ,
    rfpAgg,
    monthlyRFP,
  ] = await Promise.all([
    PurchaseOrder.aggregate([
      { $match: { organization: orgid, valid: true } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]),
    PurchaseOrder.aggregate([
      { $match: { organization: orgid, valid: true } },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]),
    PurchaseOrder.aggregate([
      {
        $match: {
          organization: orgid,
          valid: true,
          createdAt: { $gte: last12MonthsDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: '$total' },
        },
      },
    ]),
    PurchaseReceived.countDocuments({ organization: orgid, valid: true }),
    PurchaseOrder.aggregate([
      {
        $match: {
          organization: orgid,
          valid: true,
          status: { $ne: 'pending' },
        },
      },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    PurchaseOrder.aggregate([
      {
        $match: {
          organization: orgid,
          valid: true,
          status: { $ne: 'pending' },
          createdAt: { $gte: last12MonthsDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: '$total' },
        },
      },
    ]),
    Bill.aggregate([
      { $match: { organization: orgid, valid: true } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$total' },
        },
      },
    ]),
    Bill.aggregate([
      {
        $match: {
          organization: orgid,
          valid: true,
          createdAt: { $gte: last12MonthsDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: '$total' },
        },
      },
    ]),
    PaymentMade.aggregate([
      { $match: { organization: orgid, valid: true } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$amountPaid' },
        },
      },
    ]),
    PaymentMade.aggregate([
      {
        $match: {
          organization: orgid,
          valid: true,
          createdAt: { $gte: last12MonthsDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          total: { $sum: '$amountPaid' },
        },
      },
    ]),
    RFQ.aggregate([
      { $match: { organization: orgid, valid: true } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]),
    RFQ.aggregate([
      {
        $match: {
          organization: orgid,
          valid: true,
          createdAt: { $gte: last12MonthsDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
    RFP.aggregate([
      { $match: { organization: orgid, valid: true } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
        },
      },
    ]),
    RFP.aggregate([
      {
        $match: {
          organization: orgid,
          valid: true,
          createdAt: { $gte: last12MonthsDate },
        },
      },
      {
        $group: {
          _id: { month: { $month: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    message: 'Dashboard data fetched successfully',
    data: {
      purchaseorder: {
        ...(purchaseOrderAgg[0] || { count: 0, total: 0 }),
        lastOneYearData: buildLast12MonthsMap(monthlyPurchaseOrders),
      },
      purchaseorderpayment: purchaseOrderPayment || [],
      purchasereceive: {
        count: purchaseReceivedCount || 0,
        total: purchaseReceivedAmount?.[0]?.total || 0,
        lastOneYearData: buildLast12MonthsMap(monthlyPurchaseReceived),
      },
      bills: {
        count: billAgg[0]?.count || 0,
        total: billAgg[0]?.total || 0,
        lastOneYearData: buildLast12MonthsMap(monthlyBills),
      },
      paymentmade: {
        count: paymentMadeAgg[0]?.count || 0,
        total: paymentMadeAgg[0]?.total || 0,
        lastOneYearData: buildLast12MonthsMap(monthlyPayments),
      },
      rfq: {
        count: rfqAgg[0]?.count || 0,
        lastOneYearData: buildLast12MonthsMap(monthlyRFQ, 'count'), // ✅ for RFP count
      },
      rfp: {
        count: rfpAgg[0]?.count || 0,
        lastOneYearData: buildLast12MonthsMap(monthlyRFP, 'count'), // ✅ for RFP count
      },
    },
  });
});

const getPendingPayment = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const pendingPayment = await PurchaseOrder.find({
    organization: orgid,
    valid: true,
    paymentStatus: {
      $nin: ['paid', 'partial', 'advance'],
    },
  })
    .sort({
      dueDate: -1,
    })
    .select('dueDate total vendor id date paymentStatus')
    .populate('vendor', ['displayName']);
  res.status(200).json({
    success: true,
    message: 'Pending payment fetched successfully',
    data: pendingPayment,
  });
});

const getInspectionRequired = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const inspectionRequired = await PurchaseOrder.find({
    organization: orgid,
    inspectionRequired: true,
    valid: true,
    inspectionReport: { $exists: false },
  });
  res.status(200).json({
    success: true,
    message: 'Inspection required fetched successfully',
    data: inspectionRequired,
  });
});

const deletePurchaseOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const purchaseQuotation = await PurchaseOrder.findByIdAndDelete(id);
  res.status(200).json({
    success: true,
    message: 'Purchase order deleted successfully',
    data: purchaseQuotation,
  });
});

const getPurchaseQuotations = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;

  const purchaseOrders = await PurchaseOrder.find({
    vendor: vendorId,
    status: 'pending',
    valid: true,
    $or: [
      {
        inspectionRequired: { $ne: true },
      },
      {
        $and: [
          { inspectionRequired: true },
          { inspectionPassed: true },
          { inspectionReport: { $exists: true } },
        ],
      },
    ],
  });
  if (!purchaseOrders || purchaseOrders.length === 0) {
    throw new NotFoundError(
      'No purchase orders found for the provided vendorId'
    );
  }

  const purchaseQuotationIds = purchaseOrders.map((order) => order._id);

  const promises = purchaseQuotationIds.map((id) => PurchaseOrder.findById(id));
  const populatedPurchaseOrders = await Promise.all(promises);

  if (populatedPurchaseOrders.length === 0) {
    throw new NotFoundError(
      'No purchase orders quotation found for the provided vendorId'
    );
  }

  // const getItemDetails = async (itemId) => {
  //   const item = await Product.findById(itemId);
  //   return item ? item.productName : null;
  // };

  const populateItems = async (items) => {
    return await Promise.all(
      items.map((item) => {
        // const productName = await getItemDetails(item.itemId);
        // return { ...item.toObject(), productName };
        return item;
      })
    );
  };

  const responseObj = {
    purchaseQuotationIds,
    vendorId,
    totalPurchaseOrders: populatedPurchaseOrders.length,
    purchaseQuotations: await Promise.all(
      populatedPurchaseOrders.map(async (quotation) => {
        const items = await populateItems(quotation.items);
        return { ...quotation.toObject(), items };
      })
    ),
  };

  res.status(200).json({
    success: true,
    message: 'Purchase quotations fetched successfully',
    data: responseObj,
  });
});

const getPurchaseOrdersPayment = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const purchaseOrders = await PurchaseOrder.find({
    vendor: vendorId,
    paymentStatus: { $ne: 'paid' },
    valid: true,
  }).sort({ date: -1 });
  res.status(200).json({
    success: true,
    message: 'Purchase orders payment fetched successfully',
    data: purchaseOrders,
  });
});

const checkExistId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { chanageId } = req.query;

  const purchaseQuotation = await PurchaseOrder.findOne({
    organization: orgid,
    id: chanageId,
  });

  if (purchaseQuotation) {
    throw new ValidationError('This ID already exists');
  }

  res.status(200).json({
    success: true,
    message: 'ID is available',
  });
});

const getJobsByVendorId = asyncHandler(async (req, res) => {
  const { vendorId } = req.params;
  const shipmentIds = await Shipment.find({
    'items.vendor': vendorId,
    'items.purchaseRef': { $exists: false },
    valid: true,
  }).distinct('_id');

  const jobs = await Jobs.find({
    shipments: { $in: shipmentIds },
    valid: true,
  }).select('id');

  res.status(200).json({
    success: true,
    message: 'Jobs fetched successfully',
    data: jobs,
  });
});

module.exports = {
  createPurchaseOrder,
  updatePurchaseOrder,
  revisedPurchaseOrder,
  getPurchaseOrdersByAgent,
  getPurchaseOrdersByOrganization,
  getPurchaseOrdersLength,
  getPurchaseOrdersById,
  getPurchaseOrderDetailsByOrganization,
  purchaseOrderApprove,
  purchaseOrderReject,
  purchaseOrderUpdateApproval,
  purchaseOrderInvalidate,
  getFilteredPurchaseOrders,
  getFilteredPurchaseOrdersWithoutPagination,
  getFilteredPurchaseOrdersByUser,
  getDashboardData,
  getPendingPayment,
  getInspectionRequired,
  deletePurchaseOrder,
  getPurchaseQuotations,
  getPurchaseOrdersPayment,
  checkExistId,
  getJobsByVendorId,
};
