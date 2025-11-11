const Invoice = require('../../models/sales/Invoice');
const LastInsertedId = require('../../models/master/LastInsertedID');
const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
// const PaymentReceived = require('../../models/Sales/PaymentReceived');
const TT_Zatca = require('zatca');
const Customer = require('../../models/sales/Customer');
const { default: mongoose } = require('mongoose');
const CostCenter = require('../../models/accounts/CostCenter');
const {
  findNextApprovalLevelAndNotify,
  ifHasApproval,
} = require('../../utils/approvalUtils');
const Service = require('../../models/operations/Service');
const Quote = require('../../models/sales/Quotes');
// const Proposal = require('../../models/Sales/Proposal');
const ParentAccount = require('../../models/accounts/ParentAccount');
const Organization = require('../../models/auth/Organization');
const Product = require('../../models/inventory/Product');
const InventoryFleet = require('../../models/fleets/InventoryFleet');

const { asyncHandler } = require('../../middleware/errorHandler');
const {
  NotFoundError,
  ServerError,
  ValidationError,
} = require('../../utils/errors');
const { createActivityLog } = require('../../utils/logUtils');
const Shipment = require('../../models/operations/Shipment');
const Jobs = require('../../models/operations/Jobs');

const approveInvoice = async (updatedInvoice, session) => {
  const transactions = [];

  // Create transaction for each item in the invoice
  for (const item of updatedInvoice.items) {
    if (item?.inventoryAccount) {
      const acc = await Account.updateOne(
        { _id: item?.inventoryAccount || null },
        { $inc: { amount: -Number(item.price) * Number(item.quantity) } },
        { new: true, session }
      );
      transactions.push({
        product: item.itemId,
        service: item.serviceId,
        type: 'invoice',
        account: item?.inventoryAccount || null,
        invoice: updatedInvoice._id,
        reference: updatedInvoice.id,
        id: item?.productName || '',
        customer: updatedInvoice.customer,
        runningBalance: acc?.amount,
        credit: Number(item.price) * Number(item.quantity),
        company: updatedInvoice.company,
        organization: updatedInvoice.organization,
      });
    }

    if (item.type === 'product') {
      await Product.updateOne(
        { _id: item.itemId },
        {
          $inc: {
            quantityToBeInvoiced: -Number(item.quantity),
          },
        },
        { session }
      );
    } else {
      await InventoryFleet.updateOne(
        { _id: item.fleetId },
        {
          $inc: {
            quantityToBeInvoiced: -Number(item.quantity),
          },
        },
        { session }
      );
    }
  }

  const customer = await Customer.findById(updatedInvoice.customer).select(
    'displayName'
  );

  if (updatedInvoice.paymentReceived) {
    const salesAccount = await Account.findOne({
      _id: updatedInvoice.depositTo,
    }).session(session);
    if (salesAccount) {
      salesAccount.amount += Number(updatedInvoice.total);
      await salesAccount.save({ session });
      transactions.push({
        account: salesAccount?._id || null,
        type: 'invoice',
        invoice: updatedInvoice._id,
        id: customer?.displayName || '',
        reference: updatedInvoice.id,
        customer: updatedInvoice.customer,
        debit: Number(updatedInvoice.total),
        runningBalance: salesAccount?.amount,
        company: updatedInvoice.company,
        organization: updatedInvoice.organization,
      });
    }
  } else if (updatedInvoice.advance > 0) {
    const customer = await Customer.findById(updatedInvoice.customer).select(
      'displayName'
    );

    let accountsReceivable = await Account.findOne({
      accountName: customer.displayName,
      organization: updatedInvoice.organization,
    });

    if (!accountsReceivable) {
      const parentAccount = await ParentAccount.findOne({
        accountName: 'Accounts Receivable',
        organization: updatedInvoice.organization,
      });

      const newAccount = new Account({
        accountName: customer.displayName,
        accountType: 'currentasset',
        accountCode: `AC-CL-AR-${parentAccount?.childAccounts?.length + 1}`,
        currency: 'AED',
        description: '',
        parentAccount: parentAccount._id,
        organization: updatedInvoice.organization,
        company: updatedInvoice.company,
      });
      accountsReceivable = await newAccount.save();

      parentAccount.childAccounts.push(newAccount._id);
      await parentAccount.save();
    }
    accountsReceivable.amount += Number(updatedInvoice.balance);
    await accountsReceivable.save({ session });

    transactions.push({
      account: accountsReceivable._id,
      invoice: updatedInvoice._id,
      id: customer?.displayName || '',
      reference: updatedInvoice.id,
      type: 'invoice',
      customer: updatedInvoice.customer,
      debit: Number(updatedInvoice.balance),
      runningBalance: accountsReceivable?.amount,
      company: updatedInvoice.company,
      organization: updatedInvoice.organization,
    });
  } else {
    const customer = await Customer.findById(updatedInvoice.customer).select(
      'displayName'
    );

    let accountsReceivable = await Account.findOne({
      accountName: customer.displayName,
      organization: updatedInvoice.organization,
    });

    if (!accountsReceivable) {
      const parentAccount = await ParentAccount.findOne({
        accountName: 'Accounts Receivable',
        organization: updatedInvoice.organization,
      });

      const newAccount = new Account({
        accountName: customer.displayName,
        accountType: 'currentasset',
        accountCode: `AC-CL-AR-${parentAccount?.childAccounts?.length + 1}`,
        currency: 'AED',
        description: '',
        parentAccount: parentAccount._id,
        organization: updatedInvoice.organization,
        company: updatedInvoice.company,
      });
      accountsReceivable = await newAccount.save();

      parentAccount.childAccounts.push(newAccount._id);
      await parentAccount.save();
    }

    const accountsReceivableAmount = await Account.findOneAndUpdate(
      { _id: accountsReceivable._id },
      { $inc: { amount: Number(updatedInvoice.total) } },
      { new: true, session }
    );

    transactions.push({
      account: accountsReceivable._id,
      invoice: updatedInvoice._id,
      id: customer?.displayName || '',
      reference: updatedInvoice.id,
      type: 'invoice',
      customer: updatedInvoice.customer,
      debit: Number(updatedInvoice.total),
      runningBalance: accountsReceivableAmount?.amount,
      company: updatedInvoice.company,
      organization: updatedInvoice.organization,
    });
  }

  if (updatedInvoice.shippingFee !== 0) {
    const shippingAccount = await Account.findOne({
      accountName: 'Shipping Charge',
      organization: updatedInvoice.organization,
    }).session(session);
    shippingAccount.amount += Number(updatedInvoice.shippingFee);
    await shippingAccount.save({ session });

    transactions.push({
      account: shippingAccount._id,
      invoice: updatedInvoice._id,
      customer: updatedInvoice.customer,
      type: 'invoice',
      id: customer?.displayName || '',
      reference: updatedInvoice.id,
      credit: Number(updatedInvoice.shippingFee),
      runningBalance: shippingAccount?.amount,
      company: updatedInvoice.company,
      organization: updatedInvoice.organization,
    });
  }

  if (updatedInvoice.lateFees !== 0) {
    const lateFeesAccount = await Account.findOne({
      accountName: 'Late Fee Income',
      organization: updatedInvoice.organization,
    }).session(session);
    lateFeesAccount.amount += Number(updatedInvoice.lateFees);
    await lateFeesAccount.save({ session });

    transactions.push({
      account: lateFeesAccount._id,
      invoice: updatedInvoice._id,
      customer: updatedInvoice.customer,
      type: 'invoice',
      id: customer?.displayName || '',
      reference: updatedInvoice.id,
      credit: Number(updatedInvoice.lateFees),
      runningBalance: lateFeesAccount?.amount,
      company: updatedInvoice.company,
      organization: updatedInvoice.organization,
    });
  }

  if (updatedInvoice.tax !== 0) {
    const vatAccount = await Account.findOne({
      accountName: 'Output VAT',
      organization: updatedInvoice.organization,
    }).session(session);
    vatAccount.amount +=
      Number(updatedInvoice.subtotal) * (Number(updatedInvoice.tax) / 100);
    await vatAccount.save({ session });

    transactions.push({
      account: vatAccount._id,
      invoice: updatedInvoice._id,
      customer: updatedInvoice.customer,
      type: 'invoice',
      id: customer?.displayName || '',
      reference: updatedInvoice.id,
      credit:
        Number(updatedInvoice.subtotal) * (Number(updatedInvoice.tax) / 100),
      runningBalance: vatAccount?.amount,
      company: updatedInvoice.company,
      organization: updatedInvoice.organization,
    });
  }

  const organization = await Organization.findById(
    updatedInvoice.organization
  ).select('isAccrualAccounting');

  if (organization.isAccrualAccounting) {
    const incomeAccount = await Account.findById(updatedInvoice.incomeAccount);

    if (incomeAccount) {
      incomeAccount.amount += Number(updatedInvoice.subtotal);
      await incomeAccount.save({ session });

      transactions.push({
        account: incomeAccount._id,
        invoice: updatedInvoice._id,
        customer: updatedInvoice.customer,
        type: 'invoice',
        id: customer?.displayName || '',
        reference: updatedInvoice.id,
        credit: Number(updatedInvoice.subtotal),
        runningBalance: incomeAccount?.amount,
        company: updatedInvoice.company,
        organization: updatedInvoice.organization,
      });
    }
  }

  // Bulk insert transactions
  await Transaction.insertMany(transactions, { session });

  if (updatedInvoice.paymentReceived) {
    // let lastInsertedId = await LastInsertedId.findOne({
    //   entity: 'PaymentReceived',
    //   organization: updatedInvoice.organization,
    // }).session(session);
    // if (!lastInsertedId) {
    //   lastInsertedId = new LastInsertedId({
    //     entity: 'PaymentReceived',
    //     organization: updatedInvoice.organization,
    //   });
    // }
    // lastInsertedId.lastId += 1;
    // await lastInsertedId.save({ session });
    // const paymentReceivedPrefix = lastInsertedId.prefix || '';
    // const paddedId = String(lastInsertedId.lastId).padStart(3, '0');
    // const newPaymentReceived = new PaymentReceived({
    //   customer: updatedInvoice.customer,
    //   amountReceived: updatedInvoice.total,
    //   paymentDate: updatedInvoice.createdAt,
    //   id: paymentReceivedPrefix + paddedId,
    //   paymentMode: 'cash',
    //   depositTo: updatedInvoice.depositTo,
    //   reference: updatedInvoice._id,
    //   notes: updatedInvoice.notes,
    //   termsNCondition: updatedInvoice.termsNCondition,
    //   company: updatedInvoice.company,
    //   status: 'closed',
    //   organization: updatedInvoice.organization,
    //   agent: updatedInvoice.agent,
    //   order: updatedInvoice.order,
    //   items: updatedInvoice.items,
    //   totalAmount: updatedInvoice.total,
    //   invoiceNumber: updatedInvoice.id,
    //   agent: updatedInvoice.agent,
    // });
    // Save the new invoice to the database
    // const savedPaymentReceived = await newPaymentReceived.save({ session });
  }

  if (updatedInvoice.costCenter && updatedInvoice.costCenter !== '') {
    await CostCenter.findByIdAndUpdate(
      updatedInvoice.costCenter,
      {
        $push: {
          income: {
            invoice: updatedInvoice._id,
            invoiceId: updatedInvoice.id,
            amount: updatedInvoice.subtotal,
            date: updatedInvoice.createdAt,
          },
        },
        $inc: {
          totalIncome: Number(updatedInvoice.subtotal),
        },
      },
      { new: true, session }
    );
  }
};

const createInvoice = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id, customID, organization, partialStatus } = req.body;

    let lastInsertedId = await LastInsertedId.findOne({
      entity: 'Invoice',
      organization,
    }).session(session);

    if (!lastInsertedId) {
      lastInsertedId = new LastInsertedId({
        entity: 'Invoice',
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
    const salesOrderPrefix = prefix || lastInsertedId.prefix || '';
    if (prefix) {
      lastInsertedId.prefix = prefix;
      await lastInsertedId.save({ session });
    }
    const {
      items,
      customer,
      date,
      dueDate,
      total,
      subtotal,
      tax,
      notes,
      paid,
      type,
      lpo,
      trn,
      shippingFee = 0,
      lateFees = 0,
      paymentReceived,
      depositTo,
      termsNCondition,
      company,
      advance,
      balance,
      advanceReceived,
      docAttached = '',
      costCenter,
      supplyDate,
      invoicePeriod,
      quotationId,
      proposalId,
      quotationReference,
      poDate,
      incomeAccount,
      proformaInvoiceId,
      job,
      shipment,
    } = req.body;

    const paddedId = String(lastInsertedId.lastId).padStart(3, '0');

    const invoiceId =
      partialStatus === 'partial'
        ? `${salesOrderPrefix + paddedId}-P-1`
        : salesOrderPrefix + paddedId;

    // const invoiceId =
    //   partialStatus === 'partial'
    // ? prevInvoice
    //   ? prevInvoice.id.split('-P-')[0] + '-P-' + partialId
    //   : salesOrderPrefix + paddedId + '-P-1'
    // : prevInvoice
    //   ? prevInvoice.id.split('-P-')[0]
    //   : salesOrderPrefix + paddedId;

    const hasApproval = await ifHasApproval('invoice', organization);

    // Create a new instance of the Invoice model
    const newInvoice = new Invoice({
      items,
      customer,
      date,
      dueDate,
      total,
      subtotal,
      tax,
      notes,
      termsNCondition,
      paid,
      type,
      lpo,
      trn,
      id: customID ? customID : invoiceId,
      company,
      organization,
      user: req.id,
      advance: advanceReceived ? advance : 0,
      balanceAmount: advanceReceived ? balance : total,
      balance: advanceReceived ? balance : total,
      docAttached,
      costCenter,
      supplyDate,
      invoicePeriod,
      paymentReceived,
      depositTo,
      shippingFee,
      lateFees,
      quotationId,
      proposalId,
      quotationReference,
      poDate,
      approval: hasApproval ? 'pending' : 'none',
      incomeAccount,
      proformaInvoiceId,
      job,
      shipment,
    });

    // Save the new invoice to the database
    const savedInvoice = await newInvoice.save({ session });

    if (job) {
      if (shipment) {
        const shipmentDoc = await Shipment.findById(shipment);
        if (shipmentDoc) {
          shipmentDoc.items.forEach((item) => {
            const invoiceIndex = savedInvoice.items.findIndex(
              (i) => i.productName === item.productName
            );
            if (invoiceIndex !== -1) {
              item.invoiceId = savedInvoice.id;
              item.invoiceRef = savedInvoice._id;
              item.invoiceAmount = savedInvoice.items[invoiceIndex].amount;
            }
          });
          shipmentDoc.invoiceCreated = true;
          await shipmentDoc.save({ session });
        }
      } else {
        const job = await Jobs.findByIdAndUpdate(
          job,
          { invoiceCreated: true },
          { session }
        );

        for (const shipmentId of job.shipments) {
          const shipmentDoc = await Shipment.findById(shipmentId);
          if (shipmentDoc) {
            shipmentDoc.items.forEach((item) => {
              const invoiceIndex = savedInvoice.items.findIndex(
                (i) => i.productName === item.productName
              );
              if (invoiceIndex !== -1) {
                item.invoiceId = savedInvoice.id;
                item.invoiceRef = savedInvoice._id;
                item.invoiceAmount = savedInvoice.items[invoiceIndex].amount;
              }
            });
            shipmentDoc.invoiceCreated = true;
            await shipmentDoc.save({ session });
          }
        }
      }
    }

    if (savedInvoice.organization && savedInvoice.company) {
      await createActivityLog({
        userId: req.id,
        action: 'create',
        type: 'invoice',
        actionId: savedInvoice.id,
        organization: savedInvoice.organization,
        company: savedInvoice.company,
      });
    }

    if (hasApproval) {
      await findNextApprovalLevelAndNotify(
        'invoice',
        'pending',
        savedInvoice.organization,
        savedInvoice.company,
        savedInvoice.id,
        'Invoice',
        'invoice',
        savedInvoice._id
      );
    } else {
      await approveInvoice(savedInvoice, session);
    }

    // try {
    //   const customer = await Customer.findById(savedInvoice.customer);
    //   if (customer) {
    //     await customer.generateEmbedding();
    //   }
    // } catch (error) {
    //   console.error('Error generating embedding for invoice:', error);
    // }

    // Commit the transaction
    await session.commitTransaction();

    // Send the saved invoice as a response
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: savedInvoice,
    });
  } catch (error) {
    // Abort the transaction
    await session.abortTransaction();

    // Handle errors
    console.error('Error creating invoice:', error);
    throw new ServerError('Error creating invoice');
  } finally {
    session.endSession();
  }
});

const updateInvoice = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { invoiceId } = req.params;
    const {
      id,
      items,
      customer,
      date,
      dueDate,
      total,
      subtotal,
      tax,
      notes,
      paid,
      type,
      lpo,
      trn,
      orderNo,
      shippingFee = 0,
      lateFees = 0,
      termsNCondition,
      advance,
      balance,
      advanceReceived,
      docAttached,
      paymentReceived,
      costCenter,
      supplyDate,
      invoicePeriod,
      depositTo,
      incomeAccount,
    } = req.body;

    // Find the existing invoice
    const existingInvoice = await Invoice.findById(invoiceId).session(session);
    if (!existingInvoice) {
      await session.abortTransaction();
      throw new NotFoundError('Invoice not found');
    }

    if (
      existingInvoice.approval === 'approved1' ||
      existingInvoice.approval === 'approved2' ||
      existingInvoice.approval === 'none'
    ) {
      // Revert product quantity and account updates
      for (const oldItem of existingInvoice.items) {
        // Revert product quantity
        if (oldItem.type === 'product') {
          await Product.updateOne(
            { _id: oldItem.itemId },
            {
              $inc: {
                quantityToBeInvoiced: Number(oldItem.quantity),
              },
            }
          ).session(session);
        } else {
          await InventoryFleet.updateOne(
            { _id: oldItem.fleetId },
            {
              $inc: {
                quantityToBeInvoiced: Number(oldItem.quantity),
              },
            }
          ).session(session);
        }

        if (oldItem.inventoryAccount) {
          await Account.updateOne(
            { _id: oldItem.inventoryAccount },
            {
              $inc: {
                amount: Number(oldItem.price) * Number(oldItem.quantity),
              },
            }
          ).session(session);
        }
      }

      // Revert discount account update
      const discountAccount = await Account.findOne({
        accountName: 'Sales Discount',
        organization: existingInvoice.organization,
      }).session(session);
      const oldTotalDiscount = existingInvoice.items.reduce(
        (acc, item) => acc + Number(item.discount),
        0
      );
      discountAccount.amount -= oldTotalDiscount;
      await discountAccount.save({ session });

      if (existingInvoice.paymentReceived) {
        await Account.findOneAndUpdate(
          { _id: existingInvoice?.depositTo },
          { $inc: { amount: -Number(existingInvoice.total) } }
        ).session(session);
      } else if (existingInvoice.advanceReceived) {
        const customer = await Customer.findById(
          existingInvoice.customer
        ).select('displayName');

        const accountsPayable = await Account.findOne({
          accountName: customer.displayName,
          organization: existingInvoice.organization,
        });

        if (accountsPayable) {
          accountsPayable.amount -= Number(existingInvoice.balance);
          await accountsPayable.save({ session });
        }
      } else {
        const customer = await Customer.findById(
          existingInvoice.customer
        ).select('displayName');

        const accountsPayable = await Account.findOne({
          accountName: customer.displayName,
          organization: existingInvoice.organization,
        });

        if (accountsPayable) {
          accountsPayable.amount -= Number(existingInvoice.total);
          await accountsPayable.save({ session });
        }
      }

      if (existingInvoice.tax !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Output VAT',
            organization: existingInvoice.organization,
          },
          {
            $inc: {
              amount: -(
                Number(existingInvoice.subtotal) *
                Number(existingInvoice.tax / 100)
              ),
            },
          }
        ).session(session);
      }

      // if (existingInvoice.paymentReceived) {
      //   await PaymentReceived.findOneAndDelete({
      //     reference: invoiceId,
      //   }).session(session);
      // }

      if (existingInvoice.shippingFee !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Shipping Charge',
            organization: existingInvoice.organization,
          },
          { $inc: { amount: -Number(existingInvoice.shippingFee) } }
        ).session(session);
      }

      if (existingInvoice.lateFees !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Late Fee Income',
            organization: existingInvoice.organization,
          },
          { $inc: { amount: -Number(existingInvoice.lateFees) } }
        ).session(session);
      }

      if (existingInvoice?.costCenter) {
        await CostCenter.findByIdAndUpdate(
          existingInvoice.costCenter,
          {
            $pull: {
              income: { invoice: existingInvoice._id },
            },
            $inc: { totalIncome: -Number(existingInvoice.subtotal) },
          },
          { new: true, session }
        );
      }

      const organization = await Organization.findById(
        existingInvoice.organization
      ).select('isAccrualAccounting');

      if (organization.isAccrualAccounting) {
        await Account.findOneAndUpdate(
          { _id: existingInvoice.incomeAccount },
          { $inc: { amount: -Number(existingInvoice.subtotal) } }
        ).session(session);
      }

      await Transaction.deleteMany({ invoice: existingInvoice._id }).session(
        session
      );
    }

    const hasApproval = await ifHasApproval(
      'invoice',
      existingInvoice.organization
    );

    // Update invoice fields
    Object.assign(existingInvoice, {
      items,
      customer,
      id,
      date,
      dueDate,
      total,
      subtotal,
      tax,
      notes,
      paid,
      type,
      lpo,
      trn,
      orderNo,
      termsNCondition,
      user: req.id,
      advance: advanceReceived ? advance : 0,
      balanceAmount: advanceReceived ? balance : total,
      balance: advanceReceived ? balance : total,
      docAttached,
      costCenter,
      supplyDate,
      invoicePeriod,
      paymentReceived,
      depositTo,
      shippingFee,
      lateFees,
      incomeAccount,
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

    // Save the updated invoice
    const updatedInvoice = await existingInvoice.save({ session });

    if (!hasApproval) {
      await approveInvoice(updatedInvoice, session);
    }

    if (existingInvoice.organization && existingInvoice.company) {
      await createActivityLog({
        userId: req.id,
        action: 'update',
        type: 'invoice',
        actionId: updatedInvoice.id,
        organization: updatedInvoice.organization,
        company: updatedInvoice.company,
      });
    }

    // try {
    //   const customer = await Customer.findById(updatedInvoice.customer);
    //   if (customer) {
    //     await customer.generateEmbedding();
    //   }
    // } catch (error) {
    //   console.error('Error generating embedding for invoice:', error);
    // }

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating invoice:', error);
    throw new ServerError('Error updating invoice');
  } finally {
    session.endSession();
  }
});

const revisedInvoice = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { invoiceId } = req.params;
    const {
      items,
      customer,
      date,
      dueDate,
      total,
      subtotal,
      tax,
      notes,
      paid,
      type,
      lpo,
      trn,
      orderNo,
      shippingFee = 0,
      lateFees = 0,
      termsNCondition,
      advance,
      balance,
      advanceReceived,
      docAttached,
      paymentReceived,
      costCenter,
      supplyDate,
      invoicePeriod,
      depositTo,
      incomeAccount,
    } = req.body;

    // Find the existing invoice
    const existingInvoice = await Invoice.findById(invoiceId).session(session);
    if (!existingInvoice) {
      await session.abortTransaction();
      throw new NotFoundError('Invoice not found');
    }

    const baseId = existingInvoice.id.split('-REV')[0];
    const currentRevision = existingInvoice.id.includes('-REV')
      ? parseInt(existingInvoice.id.split('-REV')[1])
      : 0;

    const newRevision = currentRevision + 1;

    const newId = `${baseId}-REV${newRevision}`;

    if (
      existingInvoice.approval === 'approved1' ||
      existingInvoice.approval === 'approved2' ||
      existingInvoice.approval === 'none'
    ) {
      // Revert product quantity and account updates
      for (const oldItem of existingInvoice.items) {
        // Revert product quantity
        if (oldItem.type === 'product') {
          await Product.updateOne(
            { _id: oldItem.itemId },
            {
              $inc: {
                quantityToBeInvoiced: Number(oldItem.quantity),
              },
            }
          ).session(session);
        } else {
          await InventoryFleet.updateOne(
            { _id: oldItem.fleetId },
            {
              $inc: {
                quantityToBeInvoiced: Number(oldItem.quantity),
              },
            }
          ).session(session);
        }

        if (oldItem.inventoryAccount) {
          await Account.updateOne(
            { _id: oldItem.inventoryAccount },
            {
              $inc: {
                amount: Number(oldItem.price) * Number(oldItem.quantity),
              },
            }
          ).session(session);
        }
      }

      // Revert discount account update
      const discountAccount = await Account.findOne({
        accountName: 'Sales Discount',
        organization: existingInvoice.organization,
      }).session(session);
      const oldTotalDiscount = existingInvoice.items.reduce(
        (acc, item) => acc + Number(item.discount),
        0
      );
      discountAccount.amount -= oldTotalDiscount;
      await discountAccount.save({ session });

      if (existingInvoice.paymentReceived) {
        await Account.findOneAndUpdate(
          { _id: existingInvoice?.depositTo },
          { $inc: { amount: -Number(existingInvoice.total) } }
        ).session(session);
      } else if (existingInvoice.advanceReceived) {
        const customer = await Customer.findById(
          existingInvoice.customer
        ).select('displayName');

        const accountsPayable = await Account.findOne({
          accountName: customer.displayName,
          organization: existingInvoice.organization,
        });

        if (accountsPayable) {
          accountsPayable.amount -= Number(existingInvoice.balance);
          await accountsPayable.save({ session });
        }
      } else {
        const customer = await Customer.findById(
          existingInvoice.customer
        ).select('displayName');

        const accountsPayable = await Account.findOne({
          accountName: customer.displayName,
          organization: existingInvoice.organization,
        });

        if (accountsPayable) {
          accountsPayable.amount -= Number(existingInvoice.total);
          await accountsPayable.save({ session });
        }
      }

      if (existingInvoice.tax !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Output VAT',
            organization: existingInvoice.organization,
          },
          {
            $inc: {
              amount: -(
                Number(existingInvoice.subtotal) *
                Number(existingInvoice.tax / 100)
              ),
            },
          }
        ).session(session);
      }

      // if (existingInvoice.paymentReceived) {
      //   await PaymentReceived.findOneAndDelete({
      //     reference: invoiceId,
      //   }).session(session);
      // }

      if (existingInvoice.shippingFee !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Shipping Charge',
            organization: existingInvoice.organization,
          },
          { $inc: { amount: -Number(existingInvoice.shippingFee) } }
        ).session(session);
      }

      if (existingInvoice.lateFees !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Late Fee Income',
            organization: existingInvoice.organization,
          },
          { $inc: { amount: -Number(existingInvoice.lateFees) } }
        ).session(session);
      }

      const prevCostCenter = existingInvoice?.costCenter || null;

      if (prevCostCenter) {
        await CostCenter.findByIdAndUpdate(
          prevCostCenter,
          {
            $pull: {
              income: { invoice: existingInvoice._id },
            },
            $inc: { totalIncome: -Number(existingInvoice.subtotal) },
          },
          { new: true, session }
        );
      }

      const organization = await Organization.findById(
        existingInvoice.organization
      ).select('isAccrualAccounting');

      if (organization.isAccrualAccounting) {
        await Account.findOneAndUpdate(
          { _id: existingInvoice.incomeAccount },
          { $inc: { amount: -Number(existingInvoice.subtotal) } }
        ).session(session);
      }

      await Transaction.deleteMany({ invoice: existingInvoice._id }).session(
        session
      );
    }

    const hasApproval = await ifHasApproval(
      'invoice',
      existingInvoice.organization
    );

    // Update invoice fields
    Object.assign(existingInvoice, {
      items,
      customer,
      date,
      dueDate,
      total,
      subtotal,
      tax,
      notes,
      paid,
      type,
      lpo,
      trn,
      orderNo,
      termsNCondition,
      user: req.id,
      advance: advanceReceived ? advance : 0,
      balanceAmount: advanceReceived ? balance : total,
      balance: advanceReceived ? balance : total,
      docAttached,
      id: newId,
      costCenter,
      supplyDate,
      invoicePeriod,
      paymentReceived,
      depositTo,
      shippingFee,
      lateFees,
      incomeAccount,
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

    // Save the updated invoice
    const updatedInvoice = await existingInvoice.save({ session });

    if (!hasApproval) {
      await approveInvoice(updatedInvoice, session);
    }

    if (existingInvoice.organization && existingInvoice.company) {
      await createActivityLog({
        userId: req.id,
        action: 'update',
        type: 'invoice',
        actionId: updatedInvoice.id,
        organization: updatedInvoice.organization,
        company: updatedInvoice.company,
      });
    }

    // try {
    //   const customer = await Customer.findById(updatedInvoice.customer);
    //   if (customer) {
    //     await customer.generateEmbedding();
    //   }
    // } catch (error) {
    //   console.error('Error generating embedding for invoice:', error);
    // }

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: updatedInvoice,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating invoice:', error);
    throw new ServerError('Error updating invoice');
  } finally {
    session.endSession();
  }
});

const getInvoices = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const invoices = await Invoice.find({
    organization: orgid,
  })
    .populate('customer')
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    message: 'Invoices fetched successfully',
    data: invoices,
  });
});

const getInvoicesForUser = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({
    user: req.id,
  })
    .populate('customer')
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    message: 'Invoices fetched successfully',
    data: invoices,
  });
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findById(id)
    .populate('customer')
    .populate('items.itemId')
    .populate('items.serviceId')
    .populate('items.fleetId')
    .populate('user', [
      'signature',
      'fullName',
      'email',
      'phone',
      'userName',
      'profileType',
    ])
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
    ])
    .populate('organization');

  res.status(200).json({
    success: true,
    message: 'Invoice fetched successfully',
    data: invoice,
  });
});

const approveInvoiceStatus = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { approval } = req.body;
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    const oldApproval = invoice.approval;

    invoice.approval = approval;
    if (approval === 'approved1') {
      invoice.approvedBy1 = req.id;
      invoice.approvedAt1 = new Date();
    } else if (approval === 'approved2') {
      invoice.approvedBy2 = req.id;
      invoice.approvedAt2 = new Date();
    }

    const updatedInvoice = await invoice.save({ session });

    if (oldApproval !== 'approved1' && oldApproval !== 'approved2') {
      await approveInvoice(updatedInvoice, session);

      if (approval === 'approved1') {
        await findNextApprovalLevelAndNotify(
          'invoice',
          approval,
          updatedInvoice.organization,
          updatedInvoice.company,
          updatedInvoice.id,
          'Invoice',
          'invoice',
          updatedInvoice._id
        );
      }

      if (updatedInvoice.organization && updatedInvoice.company) {
        await createActivityLog({
          userId: req.id,
          action: 'approve',
          type: 'invoice',
          actionId: updatedInvoice.id,
          organization: updatedInvoice.organization,
          company: updatedInvoice.company,
        });
      }
    }
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Invoice approved successfully',
      data: updatedInvoice,
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(error);
    throw new ServerError('Error approving invoice');
  } finally {
    await session.endSession();
  }
});

const rejectInvoice = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const { approvalComment } = req.body;
    const existingInvoice = await Invoice.findByIdAndUpdate(
      id,
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
      },
      { session }
    );

    if (
      existingInvoice.approval === 'approved1' ||
      existingInvoice.approval === 'approved2'
    ) {
      // Revert product quantity and account updates
      for (const oldItem of existingInvoice.items) {
        // Revert product quantity
        if (oldItem.type === 'product') {
          await Product.updateOne(
            { _id: oldItem.itemId },
            {
              $inc: {
                quantityToBeInvoiced: Number(oldItem.quantity),
              },
            }
          ).session(session);
        } else {
          await InventoryFleet.updateOne(
            { _id: oldItem.fleetId },
            {
              $inc: {
                quantityToBeInvoiced: Number(oldItem.quantity),
              },
            }
          ).session(session);
        }

        if (oldItem.inventoryAccount) {
          await Account.updateOne(
            { _id: oldItem.inventoryAccount },
            {
              $inc: {
                amount: Number(oldItem.price) * Number(oldItem.quantity),
              },
            }
          ).session(session);
        }
      }

      // Revert discount account update
      const discountAccount = await Account.findOne({
        accountName: 'Sales Discount',
        organization: existingInvoice.organization,
      }).session(session);
      const oldTotalDiscount = existingInvoice.items.reduce(
        (acc, item) => acc + Number(item.discount),
        0
      );
      discountAccount.amount -= oldTotalDiscount;
      await discountAccount.save({ session });

      if (existingInvoice.paymentReceived) {
        await Account.findOneAndUpdate(
          { _id: existingInvoice?.depositTo },
          { $inc: { amount: -Number(existingInvoice.total) } }
        ).session(session);
      } else if (existingInvoice.advanceReceived) {
        const customer = await Customer.findById(
          existingInvoice.customer
        ).select('displayName');

        const accountsPayable = await Account.findOne({
          accountName: customer.displayName,
          organization: existingInvoice.organization,
        });

        if (accountsPayable) {
          accountsPayable.amount -= Number(existingInvoice.balance);
          await accountsPayable.save({ session });
        }
      } else {
        const customer = await Customer.findById(
          existingInvoice.customer
        ).select('displayName');

        const accountsPayable = await Account.findOne({
          accountName: customer.displayName,
          organization: existingInvoice.organization,
        });

        if (accountsPayable) {
          accountsPayable.amount -= Number(existingInvoice.total);
          await accountsPayable.save({ session });
        }
      }

      if (existingInvoice.tax !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Output VAT',
            organization: existingInvoice.organization,
          },
          {
            $inc: {
              amount: -(
                Number(existingInvoice.subtotal) *
                Number(existingInvoice.tax / 100)
              ),
            },
          }
        ).session(session);
      }

      // if (existingInvoice.paymentReceived) {
      //   await PaymentReceived.findOneAndDelete({
      //     reference: existingInvoice._id,
      //   }).session(session);
      // }

      if (existingInvoice.shippingFee !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Shipping Charge',
            organization: existingInvoice.organization,
          },
          { $inc: { amount: -Number(existingInvoice.shippingFee) } }
        ).session(session);
      }

      if (existingInvoice.lateFees !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Late Fee Income',
            organization: existingInvoice.organization,
          },
          { $inc: { amount: -Number(existingInvoice.lateFees) } }
        ).session(session);
      }

      const prevCostCenter = existingInvoice?.costCenter || null;

      if (prevCostCenter) {
        await CostCenter.findByIdAndUpdate(
          prevCostCenter,
          {
            $pull: {
              income: { invoice: existingInvoice._id },
            },
            $inc: { totalIncome: -Number(existingInvoice.subtotal) },
          },
          { new: true, session }
        );
      }

      const organization = await Organization.findById(
        existingInvoice.organization
      ).select('isAccrualAccounting');

      if (organization.isAccrualAccounting) {
        await Account.findOneAndUpdate(
          { _id: existingInvoice.incomeAccount },
          { $inc: { amount: -Number(existingInvoice.subtotal) } }
        ).session(session);
      }

      // Update related transactions
      await Transaction.deleteMany({ invoice: existingInvoice._id }).session(
        session
      );
    }

    if (existingInvoice.organization && existingInvoice.company) {
      await createActivityLog({
        userId: req.id,
        action: 'reject',
        type: 'invoice',
        actionId: existingInvoice.id,
        organization: existingInvoice.organization,
        company: existingInvoice.company,
      });
    }
    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: 'Invoice rejected successfully',
      data: existingInvoice,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    throw new ServerError('Error rejecting invoice');
  } finally {
    await session.endSession();
  }
});

const updateInvoiceApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approval, approvalComment } = req.body;
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  const resetFields = () => {
    invoice.verifiedBy = null;
    invoice.approvedBy1 = null;
    invoice.approvedBy2 = null;
    invoice.verifiedAt = null;
    invoice.approvedAt1 = null;
    invoice.approvedAt2 = null;
    invoice.reviewedBy = null;
    invoice.reviewedAt = null;
    invoice.acknowledgedBy = null;
    invoice.acknowledgedAt = null;
  };

  invoice.approval = approval;
  switch (approval) {
    case 'reviewed':
      invoice.reviewedBy = req.id;
      invoice.reviewedAt = new Date();
      invoice.verifiedBy = null;
      invoice.verifiedAt = null;
      invoice.acknowledgedBy = null;
      invoice.acknowledgedAt = null;
      break;
    case 'verified':
      invoice.verifiedBy = req.id;
      invoice.verifiedAt = new Date();
      invoice.acknowledgedBy = null;
      invoice.acknowledgedAt = null;
      break;
    case 'acknowledged':
      invoice.acknowledgedBy = req.id;
      invoice.acknowledgedAt = new Date();
      break;
    case 'correction':
      invoice.approvalComment = approvalComment || null;
      resetFields();
      break;
    default:
      break;
  }
  const updatedInvoice = await invoice.save();

  await findNextApprovalLevelAndNotify(
    'invoice',
    approval,
    updatedInvoice.organization,
    updatedInvoice.company,
    updatedInvoice.id,
    'Invoice',
    'invoice',
    updatedInvoice._id
  );

  if (updatedInvoice.organization && updatedInvoice.company) {
    await createActivityLog({
      userId: req.id,
      action: approval,
      type: 'invoice',
      actionId: updatedInvoice.id,
      organization: updatedInvoice.organization,
      company: updatedInvoice.company,
    });
  }

  res.status(201).json({
    success: true,
    message: 'Invoice updated successfully',
    data: updatedInvoice,
  });
});

const getQuotationsByCustomerId = asyncHandler(async (req, res) => {
  const { customerid } = req.params;

  if (customerid === 'undefined') {
    res.json([]);
    return;
  }

  const invoices = await Invoice.find({
    customer: customerid,
    valid: true,
    status: 'pending',
  }).distinct('quotationId');

  const quotation = await Quote.find({
    _id: { $nin: invoices },
    customer: customerid,
    valid: true,
    acceptStatus: 'accepted',
  });
  if (!quotation || quotation.length === 0) {
    res.json({
      success: false,
      message: 'No quotation found for the provided customerid',
      data: {
        data: 'No quotation found for the provided customerid',
      },
    });
    return;
  }

  const getItemDetails = async (itemId) => {
    const item = await Product.findById(itemId);
    return {
      productName: item ? item.productName : null,
      salesAccount: item ? item.salesAccount : null,
      purchaseAccount: item ? item.purchaseAccount : null,
      inventoryAccount: item ? item.inventoryAccount : null,
    };
  };

  const getItemDetailsFromItem = async (itemId) => {
    const item = await Service.findById(itemId);
    return {
      ProductName: item ? item.name : null,
      salesAccount: item ? item.salesAccount : null,
      purchaseAccount: item ? item.purchaseAccount : null,
      inventoryAccount: null,
    };
  };

  const populateItems = async (items) => {
    return await Promise.all(
      items.map(async (item) => {
        if (item.type === 'product') {
          const data = await getItemDetails(item.itemId);
          return { ...item.toObject(), ...data };
        } else if (item.type === 'item') {
          const data = await getItemDetailsFromItem(item.serviceId);
          return { ...item.toObject(), ...data };
        } else {
          return item;
        }
      })
    );
  };

  const responseObj = {
    SalesOrderIds: quotation.map((order) => order._id),
    customerid,
    totalPurchaseOrders: quotation?.length,
    salesorders: await Promise.all(
      quotation?.map(async (quotation) => {
        const items = await populateItems(quotation.items);
        return { ...quotation.toObject(), items };
      })
    ),
  };

  res.status(200).json({
    success: true,
    message: 'Quotations found successfully',
    data: responseObj,
  });
});

// router.get('/proposal/:customerid', async (req, res) => {
//   const customerid = req.params.customerid;

//   if (customerid === 'undefined') {
//     res.json([]);
//     return;
//   }

//   try {
//     const quotation = await Proposal.find({
//       customer: customerid,
//       valid: true,
//       acceptStatus: 'accepted',
//     });
//     if (!quotation || quotation.length === 0) {
//       return res.json({
//         data: 'No quotation found for the provided customerid',
//       });
//     }

//     const getItemDetails = async (itemId) => {
//       const item = await Product.findById(itemId);
//       return {
//         productName: item ? item.productName : null,
//         salesAccount: item ? item.salesAccount : null,
//         purchaseAccount: item ? item.purchaseAccount : null,
//         inventoryAccount: item ? item.inventoryAccount : null,
//       };
//     };

//     const getItemDetailsFromItem = async (itemId) => {
//       const item = await Service.findById(itemId);
//       return {
//         ProductName: item ? item.name : null,
//         salesAccount: item ? item.salesAccount : null,
//         purchaseAccount: item ? item.purchaseAccount : null,
//         inventoryAccount: null,
//       };
//     };

//     const populateItems = async (items) => {
//       return await Promise.all(
//         items.map(async (item) => {
//           if (item.type === 'product') {
//             const data = await getItemDetails(item.itemId);
//             return { ...item.toObject(), ...data };
//           } else if (item.type === 'item') {
//             const data = await getItemDetailsFromItem(item.itemsId);
//             return { ...item.toObject(), ...data };
//           } else {
//             return item;
//           }
//         })
//       );
//     };

//     const responseObj = {
//       SalesOrderIds: quotation.map((order) => order._id),
//       customerid: customerid,
//       totalPurchaseOrders: quotation?.length,
//       salesorders: await Promise.all(
//         quotation?.map(async (quotation) => {
//           const items = await populateItems(quotation.items);
//           return { ...quotation.toObject(), items };
//         })
//       ),
//     };

//     res.json(responseObj);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

const invalidateInvoice = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const existingInvoice = await Invoice.findByIdAndUpdate(
      id,
      {
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
          proformaInvoiceId: null,
        },
      },
      { new: true, session }
    );

    if (
      existingInvoice.approval === 'approved1' ||
      existingInvoice.approval === 'approved2' ||
      existingInvoice.approval === 'none'
    ) {
      // Revert product quantity and account updates
      for (const oldItem of existingInvoice.items) {
        // Revert product quantity
        if (oldItem.type === 'product') {
          await Product.updateOne(
            { _id: oldItem.itemId },
            {
              $inc: {
                quantityToBeInvoiced: Number(oldItem.quantity),
              },
            }
          ).session(session);
        } else {
          await InventoryFleet.updateOne(
            { _id: oldItem.fleetId },
            {
              $inc: {
                quantityToBeInvoiced: Number(oldItem.quantity),
              },
            }
          ).session(session);
        }

        if (oldItem.inventoryAccount) {
          await Account.updateOne(
            { _id: oldItem.inventoryAccount },
            {
              $inc: {
                amount: Number(oldItem.price) * Number(oldItem.quantity),
              },
            }
          ).session(session);
        }
      }

      // Revert discount account update
      const discountAccount = await Account.findOne({
        accountName: 'Sales Discount',
        organization: existingInvoice.organization,
      }).session(session);
      const oldTotalDiscount = existingInvoice.items.reduce(
        (acc, item) => acc + Number(item.discount),
        0
      );
      discountAccount.amount -= oldTotalDiscount;
      await discountAccount.save({ session });

      if (existingInvoice.paymentReceived) {
        await Account.findOneAndUpdate(
          { _id: existingInvoice?.depositTo },
          { $inc: { amount: -Number(existingInvoice.total) } }
        ).session(session);
      } else if (existingInvoice.advanceReceived) {
        const customer = await Customer.findById(
          existingInvoice.customer
        ).select('displayName');

        const accountsPayable = await Account.findOne({
          accountName: customer.displayName,
          organization: existingInvoice.organization,
        });

        if (accountsPayable) {
          accountsPayable.amount -= Number(existingInvoice.balance);
          await accountsPayable.save({ session });
        }
      } else {
        const customer = await Customer.findById(
          existingInvoice.customer
        ).select('displayName');

        const accountsPayable = await Account.findOne({
          accountName: customer.displayName,
          organization: existingInvoice.organization,
        });

        if (accountsPayable) {
          accountsPayable.amount -= Number(existingInvoice.total);
          await accountsPayable.save({ session });
        }
      }

      if (existingInvoice.tax !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Output VAT',
            organization: existingInvoice.organization,
          },
          {
            $inc: {
              amount: -(
                Number(existingInvoice.subtotal) *
                Number(existingInvoice.tax / 100)
              ),
            },
          }
        ).session(session);
      }

      // if (existingInvoice.paymentReceived) {
      //   await PaymentReceived.findOneAndDelete({
      //     reference: existingInvoice._id,
      //   }).session(session);
      // }

      if (existingInvoice.shippingFee !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Shipping Charge',
            organization: existingInvoice.organization,
          },
          { $inc: { amount: -Number(existingInvoice.shippingFee) } }
        ).session(session);
      }

      if (existingInvoice.lateFees !== 0) {
        await Account.findOneAndUpdate(
          {
            accountName: 'Late Fee Income',
            organization: existingInvoice.organization,
          },
          { $inc: { amount: -Number(existingInvoice.lateFees) } }
        ).session(session);
      }

      const prevCostCenter = existingInvoice?.costCenter || null;

      if (prevCostCenter) {
        await CostCenter.findByIdAndUpdate(
          prevCostCenter,
          {
            $pull: { income: { invoice: existingInvoice._id } },
            $inc: { totalIncome: -Number(existingInvoice.subtotal) },
          },
          { new: true, session }
        );
      }

      const organization = await Organization.findById(
        existingInvoice.organization
      ).select('isAccrualAccounting');

      if (organization.isAccrualAccounting) {
        await Account.findOneAndUpdate(
          { _id: existingInvoice.incomeAccount },
          { $inc: { amount: -Number(existingInvoice.subtotal) } }
        ).session(session);
      }

      // Update related transactions
      await Transaction.deleteMany({ invoice: existingInvoice._id }).session(
        session
      );
    }

    if (existingInvoice.organization && existingInvoice.company) {
      await createActivityLog({
        userId: req.id,
        action: 'invalidate',
        type: 'invoice',
        actionId: existingInvoice.id,
        organization: existingInvoice.organization,
        company: existingInvoice.company,
      });
    }

    await session.commitTransaction();
    res.status(201).json({
      success: true,
      message: 'Invoice invalidated successfully',
      data: existingInvoice,
    });
  } catch (error) {
    await session.abortTransaction();
    console.log('Error updating account: ', error);
    throw new ServerError('Internal Server Error');
  } finally {
    session.endSession();
  }
});

//filter
const getFilteredInvoices = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    filter_approval,
    filter_status,
    filter_validity,
    filter_customer,
    filter_order,
    customer_name = '',
    search_query = '',
    startDate,
    endDate,
    page = 1,
    limit = 25,
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

  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (filter_status) {
    query.status = filter_status;
  }
  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_customer) {
    query.customer = filter_customer;
  }
  if (customer_name !== '') {
    const customerIds = await Customer.find({
      displayName: { $regex: customer_name, $options: 'i' },
    }).distinct('_id');
    if (customerIds.length > 0) {
      query.customer = { $in: customerIds };
    } else {
      query.customer = null;
    }
  }
  if (search_query) {
    query.id = { $regex: search_query, $options: 'i' };
  }
  if (filter_order) {
    query.order = filter_order;
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
      { path: 'customer', select: 'displayName currency' },
      { path: 'job', select: 'id' },
    ],
  };

  const result = await Invoice.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Invoices fetched successfully',
    data: {
      invoices: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalInvoices: result.totalDocs,
    },
  });
});

const getFilteredInvoicesByUser = asyncHandler(async (req, res) => {
  const {
    filter_approval,
    filter_status,
    filter_validity,
    filter_customer,
    filter_order,
    customer_name = '',
    search_query = '',
    startDate,
    endDate,
    page = 1,
    limit = 25,
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
    user: req.id,
  };

  if (filter_approval) {
    query.approval = filter_approval;
  }
  if (filter_status) {
    query.status = filter_status;
  }
  if (filter_validity) {
    query.valid = filter_validity;
  }
  if (filter_customer) {
    query.customer = filter_customer;
  }
  if (customer_name !== '') {
    const customerIds = await Customer.find({
      displayName: { $regex: customer_name, $options: 'i' },
    }).distinct('_id');
    if (customerIds.length > 0) {
      query.customer = { $in: customerIds };
    } else {
      query.customer = null;
    }
  }
  if (filter_order) {
    query.order = filter_order;
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
    query.date = dateFilter;
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: { [sort_by]: sort_order === 'asc' ? 1 : -1 },
    populate: [
      { path: 'customer', select: 'displayName currency' },
      { path: 'job', select: 'id' },
    ],
  };

  const result = await Invoice.paginate(query, options);
  res.status(200).json({
    success: true,
    message: 'Invoices fetched successfully',
    data: {
      invoices: result.docs,
      currentPage: result.page,
      totalPages: result.totalPages,
      totalInvoices: result.totalDocs,
    },
  });
});

const getQRCodeForInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findById(id).populate('organization', [
    'name',
    'vat',
    'qrCode',
  ]);

  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  if (!invoice?.organization?.qrCode) {
    throw new NotFoundError('QR Code not found');
  }

  const company_name = invoice?.organization?.name,
    tax_id = invoice?.organization?.vat,
    invoice_date = new Date(invoice?.createdAt).toISOString(),
    grand_total = invoice?.total;
  const tax_total = (Number(invoice?.subtotal) * Number(invoice?.tax)) / 100;

  const generateQrCode = new TT_Zatca.GenerateQrCode(
    company_name,
    tax_id,
    invoice_date,
    grand_total,
    tax_total
  );
  const base64qr = await generateQrCode.render();
  res.json({
    success: true,
    message: 'QR Code generated successfully',
    data: { base64qr },
  });
});

const checkInvoiceExistId = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { chanageId } = req.query;

  const invoice = await Invoice.findOne({
    organization: orgid,
    id: chanageId,
  });

  if (invoice) {
    throw new ValidationError('This ID already exists');
  }

  res.json({
    success: true,
    message: 'ID is available',
    data: { success: true, message: 'ID is available' },
  });
});

const deleteInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findByIdAndDelete(id);
  res.status(200).json({
    success: true,
    message: 'Invoice deleted successfully',
    data: invoice,
  });
});

module.exports = {
  createInvoice,
  updateInvoice,
  revisedInvoice,
  getInvoices,
  getInvoicesForUser,
  getInvoiceById,
  approveInvoiceStatus,
  rejectInvoice,
  updateInvoiceApproval,
  getQuotationsByCustomerId,
  invalidateInvoice,
  getFilteredInvoices,
  getFilteredInvoicesByUser,
  getQRCodeForInvoice,
  checkInvoiceExistId,
  deleteInvoice,
};
