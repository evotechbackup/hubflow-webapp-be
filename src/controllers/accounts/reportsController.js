const Transaction = require('../../models/accounts/Transaction');
const Account = require('../../models/accounts/Account');
const Customer = require('../../models/sales/Customer');
// const Invoice = require("../../models/sales/Invoice");
const { default: mongoose } = require('mongoose');
// const Product = require("../../models/Product");
const Quote = require('../../models/sales/Quotes');
// const PaymentReceived = require("../../models/sales/PaymentReceived");
const Bills = require('../../models/procurement/Bills');
// const PaymentMade = require("../../models/purchases/PaymentMade");
const Expense = require('../../models/accounts/Expense');
const Organization = require('../../models/auth/Organization');
const ParentAccount = require('../../models/accounts/ParentAccount');
const Payroll = require('../../models/hrm/Payroll');
// const DeliveryNote = require('../../models/sales/DeliveryNote');
// const GroupPayroll = require('../../models/hrm/GroupPayroll');
const { asyncHandler } = require('../../middleware/errorHandler');

// Helper function to determine major account type
const getMajorAccountType = (accountType) => {
  if (!accountType) return 'Other';

  const type = accountType.toLowerCase();
  if (type.includes('asset') || type === 'stock' || type === 'cashandbank') {
    return 'Asset';
  } else if (type.includes('liability')) {
    return 'Liability';
  } else if (type.includes('equity')) {
    return 'Equity';
  } else if (type.includes('income')) {
    return 'Income';
  } else if (type.includes('expense') || type === 'costofgoodssold') {
    return 'Expense';
  }
  return 'Other';
};

const getProfitAndLoss = asyncHandler(async (req, res) => {
  const query = [
    'income',
    'otherincome',
    'expense',
    'costofgoodssold',
    'otherexpense',
  ];
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  // const start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }
  const result = [];
  for (let i = 0; i < query.length; i++) {
    const accountType = query[i];
    const accounts = await Account.find({
      accountType,
      organization: orgid,
    }).select('-embedding');

    let total = 0;
    const accountName = [];
    for (let j = 0; j < accounts.length; j++) {
      const transactions = await Transaction.find({
        account: accounts[j]._id,
        createdAt: {
          $gt: start,
          $lt: end,
        },
      }).select('id type debit credit');
      let amount = 0;
      for (let k = 0; k < transactions.length; k++) {
        if (accountType === 'income' || accountType === 'otherincome') {
          amount += transactions[k].credit - transactions[k].debit;
        } else {
          amount += transactions[k].debit - transactions[k].credit;
        }
      }
      total += amount;
      if (amount !== 0) {
        accountName.push({
          _id: accounts[j]._id,
          name: accounts[j].accountName,
          accountCode: accounts[j].accountCode,
          total: amount,
          transactions,
        });
      }
    }
    result.push({ type: accountType, total, accountName });
  }

  res.status(200).json({
    success: true,
    message: 'Profit and loss report retrieved successfully',
    data: { result },
  });
});

const getProfitAndLossPDF = asyncHandler(async (req, res) => {
  const query = [
    'income',
    'otherincome',
    'expense',
    'otherexpense',
    'indirectincome',
    'indirectexpense',
  ];
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }
  const result = [];
  for (let i = 0; i < query.length; i++) {
    const accountType = query[i];
    const accounts = await Account.find({
      accountType,
      organization: orgid,
    }).select('-embedding');

    let total = 0;
    const accountName = [];
    for (let j = 0; j < accounts.length; j++) {
      const transactions = await Transaction.find({
        account: accounts[j]._id,
        createdAt: {
          $gt: start,
          $lt: end,
        },
      });
      let amount = 0;
      for (let k = 0; k < transactions.length; k++) {
        if (
          accountType === 'income' ||
          accountType === 'otherincome' ||
          accountType === 'indirectincome'
        ) {
          amount += transactions[k].credit - transactions[k].debit;
        } else {
          amount += transactions[k].debit - transactions[k].credit;
        }
      }
      total += amount;
      if (amount !== 0) {
        accountName.push({
          name: accounts[j].accountName,
          accountCode: accounts[j].accountCode,
          total: amount,
        });
      }
    }
    result.push({ type: accountType, total, accountName });
  }
  const organization = await Organization.findById(orgid).lean();

  res.status(200).json({
    success: true,
    message: 'Profit and loss PDF data retrieved successfully',
    data: { organization, items: result },
  });
});

// Get request for fetching balance sheet
const getBalanceSheet = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }
  const query = [
    'othercurrentasset',
    'currentasset',
    'cashandbank',
    'fixedasset',
    'stock',
    'currentliability',
    'othercurrentliability',
    'longtermliability',
    'ownersequity',
  ];

  const result = [];
  for (let i = 0; i < query.length; i++) {
    const account = await Account.find({
      accountType: query[i],
      organization: orgid,
      accountName: { $ne: 'Drawings' },
    }).select('-embedding');

    let total = 0;
    const accountName = [];
    for (let j = 0; j < account.length; j++) {
      const transactions = await Transaction.find({
        account: account[j]._id,
        createdAt: {
          $gt: start,
          $lt: end,
        },
      });
      let amount = 0;
      for (let k = 0; k < transactions.length; k++) {
        amount += transactions[k].debit - transactions[k].credit;
      }
      total += amount;
      if (amount !== 0) {
        accountName.push({
          _id: account[j]._id,
          name: account[j].accountName,
          accountCode: account[j].accountCode,
          total: amount,
        });
      }
    }
    result.push({ type: query[i], total, accountName });
  }

  // ✅ Just this added line to fetch and include organization data
  const organization = await Organization.findById(orgid).lean();

  // ✅ Now send both result and organization together
  res.status(200).json({
    success: true,
    message: 'Balance sheet retrieved successfully',
    data: {
      organization,
      items: result,
    },
  });
});

// Get request for fetching sales by customer name
const getSalesByCustomer = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }
  const query = ['income', 'otherincome'];
  const { orgid } = req.params;
  const result = [];
  const account = await Account.find({
    accountType: { $in: query },
    organization: orgid,
  }).select('-embedding');
  // group by customer id
  const accountIds = account.map((acc) => acc._id);
  const transactions = await Transaction.aggregate([
    {
      $match: {
        account: { $in: accountIds },
        createdAt: {
          $gt: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: '$customer',
        total: { $sum: { $subtract: ['$debit', '$credit'] } },
      },
    },
  ]);
  await Promise.all(
    transactions.map(async (transaction) => {
      const customer = await Customer.findById(transaction._id);
      result.push({
        _id: customer?._id,
        customerName: customer?.displayName,
        totalSales: transaction?.total,
      });
    })
  );
  res.status(200).json({
    success: true,
    message: 'Sales by customer retrieved successfully',
    data: result,
  });
});

// Get request for fetching sales by sales person
const getSalesBySalesPerson = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }
  // const result = await Invoice.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       date: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: '$employee',
  //       totalSales: {
  //         $sum: '$total',
  //       },
  //       totalInvoices: {
  //         $sum: 1,
  //       },
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'employees',
  //       localField: '_id',
  //       foreignField: '_id',
  //       as: 'emp',
  //     },
  //   },
  //   {
  //     $unwind: '$emp',
  //   },
  //   {
  //     $project: {
  //       _id: 0,
  //       employeeId: '$_id',
  //       totalSales: 1,
  //       totalInvoices: 1,
  //       employeeName: {
  //         $concat: ['$emp.firstName', ' ', '$emp.lastName'],
  //       },
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Sales by salesperson retrieved successfully',
    data: [],
  });
});

// Get request for fetching sales by item
const getSalesByItem = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const { orgid } = req.params;
  const query = ['income', 'otherincome'];
  const account = await Account.find({
    accountType: { $in: query },
    organization: orgid,
  }).select('-embedding');
  // group by customer id
  const accountIds = account.map((acc) => acc._id);

  // const result = await Product.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //     },
  //   },
  //   {
  //     $project: {
  //       productName: 1,
  //       // salesAccount: 1,
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'transactions',
  //       localField: '_id',
  //       foreignField: 'product',
  //       as: 'sales',
  //       pipeline: [
  //         {
  //           $match: {
  //             account: { $in: accountIds },
  //             createdAt: {
  //               $gt: start,
  //               $lt: end,
  //             },
  //           },
  //         },
  //         {
  //           $project: {
  //             debit: 1,
  //             credit: 1,
  //             product: 1,
  //           },
  //         },
  //         {
  //           $group: {
  //             _id: '$product',
  //             total: {
  //               $sum: {
  //                 $subtract: ['$debit', '$credit'],
  //               },
  //             },
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: '$sales',
  //   },
  //   {
  //     $project: {
  //       productName: 1,
  //       // salesAccount: 1,
  //       totalSales: '$sales.total',
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Sales by item retrieved successfully',
    data: [],
  });
});

// Get request for fetching Customer Balances
const getCustomerBalances = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  // const result = await Invoice.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       date: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: '$customer',
  //       balance: {
  //         $sum: '$balanceAmount',
  //       },
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'customers',
  //       localField: '_id',
  //       foreignField: '_id',
  //       as: 'customer',
  //       pipeline: [
  //         {
  //           $project: {
  //             displayName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: '$customer',
  //   },
  //   {
  //     $project: {
  //       balance: 1,
  //       customer: '$customer.displayName',
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Customer balances retrieved successfully',
    data: [],
  });
});

// Get request for fetching Customer Balances Summary
const getCustomerBalanceSummary = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  // const result = await Invoice.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       date: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: '$customer',
  //       total: {
  //         $sum: '$total',
  //       },
  //       received: {
  //         $sum: {
  //           $subtract: ['$total', '$balanceAmount'],
  //         },
  //       },
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'customers',
  //       localField: '_id',
  //       foreignField: '_id',
  //       as: 'customer',
  //       pipeline: [
  //         {
  //           $project: {
  //             displayName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: '$customer',
  //   },
  //   {
  //     $project: {
  //       total: 1,
  //       received: 1,
  //       customer: '$customer.displayName',
  //       customerId: '$customer._id',
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Customer balance summary retrieved successfully',
    data: [],
  });
});

// Get request for fetching Receivable Summary
const getReceivableSummary = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  // const result = await Invoice.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       date: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'customers',
  //       localField: 'customer',
  //       foreignField: '_id',
  //       as: 'customer',
  //       pipeline: [
  //         {
  //           $project: {
  //             displayName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: '$customer',
  //   },
  //   {
  //     $sort: {
  //       date: -1,
  //     },
  //   },
  //   {
  //     $project: {
  //       customer: '$customer.displayName',
  //       customerId: '$customer._id',
  //       id: 1,
  //       date: 1,
  //       status: 1,
  //       total: 1,
  //       balanceAmount: 1,
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Receivable summary retrieved successfully',
    data: [],
  });
});

// Get request for fetching Receivable Details
const getReceivableDetails = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  // const result = await Invoice.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       date: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'customers',
  //       localField: 'customer',
  //       foreignField: '_id',
  //       as: 'customer',
  //       pipeline: [
  //         {
  //           $project: {
  //             displayName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $sort: {
  //       date: -1,
  //     },
  //   },
  //   {
  //     $unwind: '$customer',
  //   },
  //   {
  //     $unwind: '$items',
  //   },
  //   {
  //     $project: {
  //       customer: '$customer.displayName',
  //       customerId: '$customer._id',
  //       item: '$items.productName',
  //       quantity: '$items.quantity',
  //       amount: '$items.amount',
  //       id: 1,
  //       date: 1,
  //       status: 1,
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Data retrieved successfully',
    data: [],
  });
});

// Get request for fetching Invoice Details
const getInvoiceDetails = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  // const result = await Invoice.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       date: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $sort: {
  //       date: -1,
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'customers',
  //       localField: 'customer',
  //       foreignField: '_id',
  //       as: 'customer',
  //       pipeline: [
  //         {
  //           $project: {
  //             displayName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: '$customer',
  //   },
  //   {
  //     $lookup: {
  //       from: 'salesorders',
  //       localField: 'salesOrderRef',
  //       foreignField: '_id',
  //       as: 'salesorderid',
  //       pipeline: [
  //         {
  //           $project: {
  //             id: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: {
  //       path: '$salesorderid',
  //       preserveNullAndEmptyArrays: true,
  //     },
  //   },
  //   {
  //     $project: {
  //       customer: '$customer.displayName',
  //       salesorderid: '$salesorderid.id',
  //       id: 1,
  //       date: 1,
  //       status: 1,
  //       total: 1,
  //       balanceAmount: 1,
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Data retrieved successfully',
    data: [],
  });
});

// Get request for fetching Delivery Challan Details
const getDCDetails = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  // const result = await DeliveryNote.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       date: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $sort: {
  //       date: -1,
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'customers',
  //       localField: 'customer',
  //       foreignField: '_id',
  //       as: 'customer',
  //       pipeline: [
  //         {
  //           $project: {
  //             displayName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: '$customer',
  //   },
  //   {
  //     $project: {
  //       id: 1,
  //       date: 1,
  //       status: 1,
  //       invoiceStatus: 1,
  //       customer: '$customer.displayName',
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Data retrieved successfully',
    data: [],
  });
});

// Get request for fetching Quote Details
const getQuotesDetails = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const result = await Quote.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
        date: {
          $gt: start,
          $lt: end,
        },
      },
    },
    {
      $sort: {
        date: -1,
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
        pipeline: [
          {
            $project: {
              displayName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: '$customer',
    },
    {
      $project: {
        date: 1,
        id: 1,
        rfqNumber: 1,
        total: 1,
        customer: '$customer.displayName',
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Data retrieved successfully',
    data: result,
  });
});

// Get request for fetching Payments Received
const getPaymentsReceived = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  // const result = await PaymentReceived.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       paymentDate: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $sort: {
  //       paymentDate: -1,
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'customers',
  //       localField: 'customer',
  //       foreignField: '_id',
  //       as: 'customer',
  //       pipeline: [
  //         {
  //           $project: {
  //             displayName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'accounts',
  //       localField: 'depositTo',
  //       foreignField: '_id',
  //       as: 'account',
  //       pipeline: [
  //         {
  //           $project: {
  //             accountName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: '$customer',
  //   },
  //   {
  //     $unwind: {
  //       path: '$account',
  //       preserveNullAndEmptyArrays: true,
  //     },
  //   },
  //   {
  //     $project: {
  //       paymentDate: 1,
  //       id: 1,
  //       customer: '$customer.displayName',
  //       account: '$account.accountName',
  //       paymentMode: 1,
  //       status: 1,
  //       amountReceived: 1,
  //       invoiceNumber: 1,
  //       invoiceId: '$reference',
  //       totalAmount: 1,
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Data retrieved successfully',
    data: [],
  });
});

// Get request for fetching Vendor Balance Summary
const getVendorBalanceSummary = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const stage1 = await Bills.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
        billDate: {
          $gt: start,
          $lt: end,
        },
      },
    },
    {
      $lookup: {
        from: 'vendors',
        localField: 'vendor',
        foreignField: '_id',
        as: 'vendor',
      },
    },
    {
      $unwind: '$vendor',
    },
    {
      $group: {
        _id: '$vendor._id',
        vendorName: { $first: '$vendor.displayName' },
        billedAmount: {
          $sum: '$total',
        },
      },
    },
  ]);

  // const stage2 = await PaymentMade.aggregate([
  //   {
  //     $match: {
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       valid: true,
  //       paymentDate: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: '$vendor',
  //       paid: {
  //         $sum: '$amountPaid',
  //       },
  //     },
  //   },
  // ]);

  // Merging stage1 and stage2 results
  const mergedResults = stage1.map((bill) => {
    const payment = [].find(
      (pay) => pay._id.toString() === bill._id.toString()
    );
    return {
      vendorId: bill._id,
      vendorName: bill.vendorName,
      billedAmount: bill.billedAmount,
      paidAmount: payment ? payment.paid : 0,
      balance: bill.billedAmount - (payment ? payment.paid : 0),
    };
  });

  res.status(200).json({
    success: true,
    message: 'Vendor balance summary retrieved successfully',
    data: mergedResults,
  });
});

// Get request for fetching Procurement Payable Summary
const getProcurementPayableSummary = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const result = await Bills.find({
    organization: orgid,
    valid: true,
    billDate: {
      $gt: start,
      $lt: end,
    },
  })
    .select('status id billDate vendor total poNo orderNo docAttached')
    .populate('vendor', ['displayName'])
    .populate('poNo', ['id'])
    .populate({
      path: 'orderNo',
      select: 'id',
      populate: {
        path: 'purchaseOrder',
        select: 'id',
      },
    })
    .sort({ billDate: -1 });

  res.status(200).json({
    success: true,
    message: 'Data retrieved successfully',
    data: result,
  });
});

const getPayrollPayableSummary = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const payroll = await Payroll.find({
    organization: orgid,
    isDeleted: false,
    fromGroupPayroll: false,
    voucherCreated: false,
    startDate: {
      $gt: start,
      $lt: end,
    },
  })
    .select('id startDate totalPay employeeName month startDate endDate')
    .sort({ startDate: -1 });

  // const groupPayroll = await GroupPayroll.find({
  //   organization: orgid,
  //   isDeleted: false,
  //   voucherCreated: false,
  //   startDate: {
  //     $gt: start,
  //     $lt: end,
  //   },
  // })
  //   .select('id title startDate endDate recordedTime month')
  //   .sort({ startDate: -1 });

  // const timesheetPayroll = await TimesheetPayroll.find({
  //   organization: orgid,
  //   valid: true,
  //   voucherCreated: false,
  //   startDate: {
  //     $gt: start,
  //     $lt: end,
  //   },
  // })
  //   .select(
  //     'id title startDate endDate recordedTime month projectId timesheetId'
  //   )
  //   .populate('timesheetId', ['title', 'month'])
  //   .populate('projectId', ['projectName', 'projectCode'])
  //   .sort({ startDate: -1 });

  res.status(200).json({
    success: true,
    message: 'Payroll payable summary retrieved successfully',
    data: {
      payroll,
      groupPayroll: [],
      timesheetPayroll: [],
    },
  });
});

// Get request for fetching Payable Details
const getPayableDetails = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const result = await Bills.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
        billDate: {
          $gt: start,
          $lt: end,
        },
      },
    },
    {
      $lookup: {
        from: 'vendors',
        localField: 'vendor',
        foreignField: '_id',
        as: 'vendor',
        pipeline: [
          {
            $project: {
              displayName: 1,
            },
          },
        ],
      },
    },
    {
      $sort: {
        billDate: -1,
      },
    },
    {
      $unwind: '$vendor',
    },
    {
      $unwind: '$items',
    },
    {
      $project: {
        vendor: '$vendor.displayName',
        item: '$items.productName',
        quantity: '$items.quantity',
        price: '$items.price',
        amount: '$items.amount',
        id: 1,
        billDate: 1,
        status: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Data retrieved successfully',
    data: result,
  });
});

// Get request for time to pay
const getTimeToPay = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  // const result = await PaymentReceived.aggregate([
  //   {
  //     $match: {
  //       status: 'closed',
  //       valid: true,
  //       organization: new mongoose.Types.ObjectId(orgid),
  //       paymentDate: {
  //         $gt: start,
  //         $lt: end,
  //       },
  //     },
  //   },
  //   {
  //     $project: {
  //       paymentDate: 1,
  //       customer: 1,
  //       paymentDate: 1,
  //       reference: 1,
  //     },
  //   },
  //   {
  //     $sort: {
  //       paymentDate: -1,
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'customers',
  //       localField: 'customer',
  //       foreignField: '_id',
  //       as: 'customer',
  //       pipeline: [
  //         {
  //           $project: {
  //             displayName: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $lookup: {
  //       from: 'invoices',
  //       localField: 'reference',
  //       foreignField: '_id',
  //       as: 'invoice',
  //       pipeline: [
  //         {
  //           $project: {
  //             id: 1,
  //             date: 1,
  //           },
  //         },
  //       ],
  //     },
  //   },
  //   {
  //     $unwind: '$customer',
  //   },
  //   {
  //     $unwind: '$invoice',
  //   },
  //   {
  //     $addFields: {
  //       daysDifference: {
  //         $divide: [
  //           {
  //             $subtract: ['$paymentDate', '$invoice.date'],
  //           },
  //           1000 * 60 * 60 * 24,
  //         ],
  //       },
  //     },
  //   },
  //   {
  //     $group: {
  //       _id: '$customer._id',
  //       customerName: {
  //         $first: '$customer.displayName',
  //       },
  //       totalInvoices: { $sum: 1 },
  //       15: {
  //         $sum: {
  //           $cond: [{ $lte: ['$daysDifference', 15] }, 1, 0],
  //         },
  //       },
  //       30: {
  //         $sum: {
  //           $cond: [
  //             {
  //               $and: [
  //                 { $gt: ['$daysDifference', 15] },
  //                 { $lte: ['$daysDifference', 30] },
  //               ],
  //             },
  //             1,
  //             0,
  //           ],
  //         },
  //       },
  //       45: {
  //         $sum: {
  //           $cond: [
  //             {
  //               $and: [
  //                 { $gt: ['$daysDifference', 30] },
  //                 { $lte: ['$daysDifference', 45] },
  //               ],
  //             },
  //             1,
  //             0,
  //           ],
  //         },
  //       },
  //       above45: {
  //         $sum: {
  //           $cond: [{ $gt: ['$daysDifference', 45] }, 1, 0],
  //         },
  //       },
  //     },
  //   },
  //   {
  //     $project: {
  //       _id: 0,
  //       customer: '$_id',
  //       customerName: 1,
  //       15: {
  //         $multiply: [{ $divide: ['$15', '$totalInvoices'] }, 100],
  //       },
  //       30: {
  //         $multiply: [{ $divide: ['$30', '$totalInvoices'] }, 100],
  //       },
  //       45: {
  //         $multiply: [{ $divide: ['$45', '$totalInvoices'] }, 100],
  //       },
  //       above45: {
  //         $multiply: [
  //           {
  //             $divide: ['$above45', '$totalInvoices'],
  //           },
  //           100,
  //         ],
  //       },
  //     },
  //   },
  //   {
  //     $project: {
  //       customer: 1,
  //       customerName: 1,
  //       15: { $round: ['$15', 2] },
  //       30: { $round: ['$30', 2] },
  //       45: { $round: ['$45', 2] },
  //       above45: { $round: ['$above45', 2] },
  //     },
  //   },
  // ]);

  res.status(200).json({
    success: true,
    message: 'Data retrieved successfully',
    data: [],
  });
});

const getExpenseDetails = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const expenses = await Expense.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
        date: {
          $gt: start,
          $lt: end,
        },
      },
    },
    {
      $project: {
        date: 1,
        expenseAccount: 1,
        amount: 1,
        vendor: 1,
        reference: 1,
        customer: 1,
      },
    },
    {
      $lookup: {
        from: 'accounts',
        localField: 'expenseAccount',
        foreignField: '_id',
        as: 'expenseAccount',
        pipeline: [
          {
            $project: {
              accountName: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'vendors',
        localField: 'vendor',
        foreignField: '_id',
        as: 'vendor',
        pipeline: [
          {
            $project: {
              displayName: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
        pipeline: [
          {
            $project: {
              displayName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$expenseAccount',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$vendor',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$customer',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        date: 1,
        expenseAccount: '$expenseAccount.accountName',
        expenseAccountId: '$expenseAccount._id',
        vendor: '$vendor.displayName',
        vendorId: '$vendor._id',
        customer: '$customer.displayName',
        customerId: '$customer._id',
        amount: 1,
        reference: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Expenses retrieved successfully',
    data: expenses,
  });
});

const getExpenseByCategory = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const expenses = await Expense.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
        date: {
          $gt: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: '$expenseAccount',
        amount: {
          $sum: '$amount',
        },
      },
    },
    {
      $lookup: {
        from: 'accounts',
        localField: '_id',
        foreignField: '_id',
        as: 'account',
        pipeline: [
          {
            $project: {
              accountName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$account',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        accountId: '$account._id',
        account: '$account.accountName',
        amount: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Expenses retrieved successfully',
    data: expenses,
  });
});

const getExpenseByCustomer = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const expenses = await Expense.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
        date: {
          $gt: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: '$customer',
        amount: {
          $sum: '$amount',
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $lookup: {
        from: 'customers',
        localField: '_id',
        foreignField: '_id',
        as: 'customer',
        pipeline: [
          {
            $project: {
              displayName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$customer',
      },
    },
    {
      $project: {
        customerId: '$customer._id',
        customer: '$customer.displayName',
        amount: 1,
        count: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Expenses retrieved successfully',
    data: expenses,
  });
});

const getExpenseByVendor = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const expenses = await Expense.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        valid: true,
        date: {
          $gt: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: '$vendor',
        amount: {
          $sum: '$amount',
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $lookup: {
        from: 'vendors',
        localField: '_id',
        foreignField: '_id',
        as: 'vendor',
        pipeline: [
          {
            $project: {
              displayName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$vendor',
      },
    },
    {
      $project: {
        vendorId: '$vendor._id',
        vendor: '$vendor.displayName',
        amount: 1,
        count: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    message: 'Expenses retrieved successfully',
    data: expenses,
  });
});

const getMovementOfEquity = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const incomeTypes = ['income', 'otherincome'];
  const expenseTypes = ['expense', 'costofgoodssold', 'otherexpense'];

  const allTypes = [...incomeTypes, ...expenseTypes];

  const accounts = await Account.find({
    accountType: { $in: allTypes },
    organization: orgid,
  }).select('-embedding');

  const accountIds = accounts.map((account) => account._id);
  const transactions = await Transaction.find({
    account: { $in: accountIds },
    createdAt: {
      $gt: start,
      $lt: end,
    },
  });

  let totalGross = 0;
  let totalExpense = 0;

  transactions.forEach((transaction) => {
    const account = accounts.find((acc) => acc._id.equals(transaction.account));
    const amount = transaction.debit - transaction.credit;

    if (incomeTypes.includes(account.accountType)) {
      totalGross += amount;
    } else if (expenseTypes.includes(account.accountType)) {
      totalExpense += amount;
    }
  });

  const netProfit = totalGross - totalExpense;

  res.status(200).json({
    success: true,
    message: 'Movement of equity calculated successfully',
    data: { netProfit },
  });
});

const getCashFlowStatement = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const query = {
    operating: [
      'income',
      'otherincome',
      'expense',
      'costofgoodssold',
      'otherexpense',
      'cashandbank',
      'othercurrentasset',
      'othercurrentliability',
    ],
    investing: ['fixedasset', 'stock', 'currentasset'],
    financing: ['ownersequity', 'longtermliability', 'currentliability'],
  };

  const accountTypes = [
    ...query.operating,
    ...query.investing,
    ...query.financing,
  ];

  const accounts = await Account.find({
    accountType: { $in: accountTypes },
    organization: orgid,
    accountName: { $ne: 'Drawings' },
  }).select('-embedding');

  const accountIds = accounts.map((account) => account._id);
  const transactions = await Transaction.find({
    account: { $in: accountIds },
    createdAt: {
      $gt: start,
      $lt: end,
    },
  });

  const result = {
    operating: { total: 0, accountDetails: [] },
    investing: { total: 0, accountDetails: [] },
    financing: { total: 0, accountDetails: [] },
  };

  const transactionsByAccount = transactions.reduce((acc, transaction) => {
    if (!acc[transaction.account]) {
      acc[transaction.account] = [];
    }
    acc[transaction.account].push(transaction);
    return acc;
  }, {});

  accounts.forEach((account) => {
    const accountTransactions = transactionsByAccount[account._id] || [];
    const totalAmount = accountTransactions.reduce(
      (sum, txn) => sum + (txn.debit - txn.credit),
      0
    );

    if (totalAmount !== 0) {
      let activityType;
      if (query.operating.includes(account.accountType)) {
        activityType = 'operating';
      } else if (query.investing.includes(account.accountType)) {
        activityType = 'investing';
      } else if (query.financing.includes(account.accountType)) {
        activityType = 'financing';
      }

      result[activityType].total += totalAmount;
      result[activityType].accountDetails.push({
        _id: account._id,
        name: account.accountName,
        accountCode: account.accountCode,
        total: totalAmount,
      });
    }
  });

  res.status(200).json({
    success: true,
    message: 'Cash flow statement retrieved successfully',
    data: {
      result,
    },
  });
});

const getCashFlowStatementPDF = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const query = {
    operating: [
      'income',
      'otherincome',
      'expense',
      'costofgoodssold',
      'otherexpense',
      'cashandbank',
      'othercurrentasset',
      'othercurrentliability',
    ],
    investing: ['fixedasset', 'stock', 'currentasset'],
    financing: ['ownersequity', 'longtermliability', 'currentliability'],
  };

  const accountTypes = [
    ...query.operating,
    ...query.investing,
    ...query.financing,
  ];

  const accounts = await Account.find({
    accountType: { $in: accountTypes },
    organization: orgid,
    accountName: { $ne: 'Drawings' },
  }).select('-embedding');

  const accountIds = accounts.map((account) => account._id);
  const transactions = await Transaction.find({
    account: { $in: accountIds },
    createdAt: {
      $gt: start,
      $lt: end,
    },
  });

  const result = {
    operating: { total: 0, accountDetails: [] },
    investing: { total: 0, accountDetails: [] },
    financing: { total: 0, accountDetails: [] },
  };

  const transactionsByAccount = transactions.reduce((acc, transaction) => {
    if (!acc[transaction.account]) {
      acc[transaction.account] = [];
    }
    acc[transaction.account].push(transaction);
    return acc;
  }, {});

  accounts.forEach((account) => {
    const accountTransactions = transactionsByAccount[account._id] || [];
    const totalAmount = accountTransactions.reduce(
      (sum, txn) => sum + (txn.debit - txn.credit),
      0
    );

    if (totalAmount !== 0) {
      let activityType;
      if (query.operating.includes(account.accountType)) {
        activityType = 'operating';
      } else if (query.investing.includes(account.accountType)) {
        activityType = 'investing';
      } else if (query.financing.includes(account.accountType)) {
        activityType = 'financing';
      }

      result[activityType].total += totalAmount;
      result[activityType].accountDetails.push({
        name: account.accountName,
        accountCode: account.accountCode,
        total: totalAmount,
      });
    }
  });
  const organization = await Organization.findById(orgid).lean();
  res.status(200).json({
    success: true,
    message: 'Cash flow statement PDF data retrieved successfully',
    data: {
      organization,
      items: result,
    },
  });
});

const getTrialBalance = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const accounts = await Account.find({ organization: orgid })
    .sort({
      accountName: 1,
    })
    .select('accountName accountCode amount')
    .lean();

  const accountIds = accounts.map((acc) => acc._id);

  const latestTransactions = await Transaction.aggregate([
    {
      $match: {
        account: { $in: accountIds },
        createdAt: {
          $gt: start,
          $lt: end,
        },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$account',
        debit: { $first: '$debit' },
        credit: { $first: '$credit' },
      },
    },
  ]);

  const transactionMap = {};
  latestTransactions.forEach((txn) => {
    transactionMap[txn._id.toString()] = txn;
  });

  const result = [];
  for (const account of accounts) {
    const txn = transactionMap[account._id.toString()];
    if (txn) {
      if (txn.debit > 0) {
        result.push({
          accountId: account._id,
          accountName: account.accountName,
          accountCode: account.accountCode || '',
          amount: account.amount,
          debit: account.amount,
          credit: 0,
        });
      } else {
        result.push({
          accountId: account._id,
          accountName: account.accountName,
          accountCode: account.accountCode || '',
          amount: account.amount,
          debit: 0,
          credit: account.amount,
        });
      }
    } else {
      result.push({
        accountId: account._id,
        accountName: account.accountName,
        accountCode: account.accountCode || '',
        amount: account.amount,
        debit: 0,
        credit: 0,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: 'General ledger retrieved successfully',
    data: {
      result,
    },
  });
});

const getGeneralLedger = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const accounts = await Account.find({ organization: orgid })
    .sort({
      accountName: 1,
    })
    .select('accountName accountCode amount accountType')
    .lean();

  const accountIds = accounts.map((acc) => acc._id);

  const transactions = await Transaction.find({
    account: { $in: accountIds },
    createdAt: { $gte: start, $lte: end },
  })
    .select('account debit credit')
    .lean();

  const transactionsByAccount = {};
  transactions.forEach((transaction) => {
    const accountId = transaction.account.toString();
    if (!transactionsByAccount[accountId]) {
      transactionsByAccount[accountId] = {
        totalDebit: 0,
        totalCredit: 0,
      };
    }
    transactionsByAccount[accountId].totalDebit += transaction.debit || 0;
    transactionsByAccount[accountId].totalCredit += transaction.credit || 0;
  });

  const getMajorAccountType = (accountType) => {
    if (!accountType) return 'Other';

    const type = accountType.toLowerCase();
    if (type.includes('asset') || type === 'stock' || type === 'cashandbank') {
      return 'Asset';
    } else if (type.includes('liability')) {
      return 'Liability';
    } else if (type.includes('equity')) {
      return 'Equity';
    } else if (type.includes('income')) {
      return 'Income';
    } else if (type.includes('expense') || type === 'costofgoodssold') {
      return 'Expense';
    }
    return 'Other';
  };

  const calculateAmount = (accountType, totalDebit, totalCredit) => {
    const majorType = getMajorAccountType(accountType);

    if (majorType === 'Asset' || majorType === 'Expense') {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  };

  const accountsByMajorType = {};

  accounts.forEach((account) => {
    const accountId = account._id.toString();
    const transactions = transactionsByAccount[accountId] || {
      totalDebit: 0,
      totalCredit: 0,
    };

    const majorType = getMajorAccountType(account.accountType);
    const amount = calculateAmount(
      account.accountType,
      transactions.totalDebit,
      transactions.totalCredit
    );

    if (!accountsByMajorType[majorType]) {
      accountsByMajorType[majorType] = {
        type: majorType,
        accounts: [],
        totalAmount: 0,
      };
    }

    const accountData = {
      accountId: account._id,
      accountName: account.accountName,
      accountCode: account.accountCode,
      totalDebit: transactions.totalDebit,
      totalCredit: transactions.totalCredit,
      amount,
      accountType: account.accountType,
    };

    accountsByMajorType[majorType].accounts.push(accountData);
    accountsByMajorType[majorType].totalAmount += amount;
  });

  const result = Object.values(accountsByMajorType).sort((a, b) => {
    const order = [
      'Asset',
      'Liability',
      'Equity',
      'Income',
      'Expense',
      'Other',
    ];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

  result.forEach((majorType) => {
    majorType.accounts.sort((a, b) =>
      a.accountName.localeCompare(b.accountName)
    );
  });

  res.status(200).json({
    success: true,
    message: 'General ledger retrieved successfully',
    data: {
      data: result,
      dateRange: {
        startDate: start,
        endDate: end,
      },
      summary: {
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
      },
    },
  });
});

const getDetailedGeneralLedger = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const accounts = await Account.find({ organization: orgid })
    .sort({
      accountName: 1,
    })
    .select('accountName accountCode amount accountType')
    .lean();

  const accountIds = accounts.map((acc) => acc._id);

  const transactions = await Transaction.find({
    account: { $in: accountIds },
    createdAt: { $gte: start, $lte: end },
  })
    .select('account debit credit id createdAt reference type')
    .lean();

  const transactionsByAccount = {};
  transactions.forEach((transaction) => {
    const accountId = transaction.account.toString();
    if (!transactionsByAccount[accountId]) {
      transactionsByAccount[accountId] = {
        totalDebit: 0,
        totalCredit: 0,
        transactions: [],
      };
    }
    transactionsByAccount[accountId].totalDebit += transaction.debit || 0;
    transactionsByAccount[accountId].totalCredit += transaction.credit || 0;
    transactionsByAccount[accountId].transactions.push(transaction);
  });

  const getMajorAccountType = (accountType) => {
    if (!accountType) return 'Other';

    const type = accountType.toLowerCase();
    if (type.includes('asset') || type === 'stock' || type === 'cashandbank') {
      return 'Asset';
    } else if (type.includes('liability')) {
      return 'Liability';
    } else if (type.includes('equity')) {
      return 'Equity';
    } else if (type.includes('income')) {
      return 'Income';
    } else if (type.includes('expense') || type === 'costofgoodssold') {
      return 'Expense';
    }
    return 'Other';
  };

  const calculateAmount = (accountType, totalDebit, totalCredit) => {
    const majorType = getMajorAccountType(accountType);

    if (majorType === 'Asset' || majorType === 'Expense') {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  };

  const accountsByMajorType = {};

  accounts.forEach((account) => {
    const accountId = account._id.toString();
    const transactions = transactionsByAccount[accountId] || {
      totalDebit: 0,
      totalCredit: 0,
      transactions: [],
    };

    const majorType = getMajorAccountType(account.accountType);
    const amount = calculateAmount(
      account.accountType,
      transactions.totalDebit,
      transactions.totalCredit
    );

    if (!accountsByMajorType[majorType]) {
      accountsByMajorType[majorType] = {
        type: majorType,
        accounts: [],
        totalAmount: 0,
      };
    }

    const accountData = {
      accountId: account._id,
      accountName: account.accountName,
      accountCode: account.accountCode,
      totalDebit: transactions.totalDebit,
      totalCredit: transactions.totalCredit,
      amount,
      accountType: account.accountType,
      transactions: transactions.transactions,
    };

    accountsByMajorType[majorType].accounts.push(accountData);
    accountsByMajorType[majorType].totalAmount += amount;
  });

  const result = Object.values(accountsByMajorType).sort((a, b) => {
    const order = [
      'Asset',
      'Liability',
      'Equity',
      'Income',
      'Expense',
      'Other',
    ];
    return order.indexOf(a.type) - order.indexOf(b.type);
  });

  result.forEach((majorType) => {
    majorType.accounts.sort((a, b) =>
      a.accountName.localeCompare(b.accountName)
    );
  });

  res.status(200).json({
    success: true,
    message: 'Detailed general ledger retrieved successfully',
    data: {
      data: result,
      dateRange: {
        startDate: start,
        endDate: end,
      },
      summary: {
        totalAccounts: accounts.length,
        totalTransactions: transactions.length,
      },
    },
  });
});

const getAccountTransactions = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const accounts = await Account.find({ organization: orgid }).distinct('_id');

  const transactions = await Transaction.find({
    account: { $in: accounts },
    createdAt: { $gte: start, $lte: end },
  })
    .select('account debit credit id createdAt reference type')
    .populate('account', 'accountName accountCode accountType')
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    data: {
      data: transactions,
      dateRange: {
        startDate: start,
        endDate: end,
      },
    },
  });
});

const getAccountTypeSummary = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const result = await ParentAccount.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
      },
    },
    {
      $lookup: {
        from: 'transactions',
        localField: 'childAccounts',
        foreignField: 'account',
        as: 'transactions',
        pipeline: [
          {
            $match: {
              createdAt: { $gte: start, $lte: end },
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$transactions',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$_id',
        totalDebit: { $sum: '$transactions.debit' },
        totalCredit: { $sum: '$transactions.credit' },
        accountName: { $first: '$accountName' },
        accountType: { $first: '$accountType' },
      },
    },
  ]);

  const finalResult = {};

  result.forEach((acc) => {
    const majorType = getMajorAccountType(acc.accountType);
    if (!finalResult[majorType]) {
      finalResult[majorType] = {
        totalDebit: 0,
        totalCredit: 0,
        accounts: [],
      };
    }
    finalResult[majorType].totalDebit += acc.totalDebit;
    finalResult[majorType].totalCredit += acc.totalCredit;
    finalResult[majorType].accounts.push(acc);
  });

  res.status(200).json({
    success: true,
    data: {
      data: finalResult,
      dateRange: {
        startDate: start,
        endDate: end,
      },
    },
  });
});

const getJournals = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const { startDate, endDate } = req.query;
  let start;
  if (startDate && startDate !== 'null') {
    start = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  } else {
    start = new Date(0);
  }
  let end;
  if (endDate && endDate !== 'null') {
    end = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  } else {
    end = new Date();
  }

  const accounts = await Account.find({
    organization: orgid,
  }).distinct('_id');

  const accountIds = accounts.map((id) => new mongoose.Types.ObjectId(id));

  const transactions = await Transaction.aggregate([
    {
      $match: {
        account: {
          $in: accountIds,
        },
        createdAt: { $gte: start, $lte: end },
        type: {
          $in: [
            'invoice',
            'payment receipt',
            'bill',
            'payment made',
            'payroll',
            'payrollvoucher',
            'expensevoucher',
            'pcrvoucher',
            'pccvoucher',
          ],
        },
      },
    },
    {
      $lookup: {
        from: 'accounts',
        localField: 'account',
        foreignField: '_id',
        as: 'accountDetails',
      },
    },
    {
      $unwind: {
        path: '$accountDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        accountName: '$accountDetails.accountName',
        accountCode: '$accountDetails.accountCode',
        accountType: '$accountDetails.accountType',
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%d %b %Y', date: '$createdAt' } },
          id: '$id',
          reference: '$reference',
        },
        transactions: {
          $push: {
            _id: '$_id',
            id: '$id',
            reference: '$reference',
            debit: '$debit',
            credit: '$credit',
            type: '$type',
            accountName: '$accountName',
            accountCode: '$accountCode',
            accountType: '$accountType',
            account: '$account',
            createdAt: '$createdAt',
            updatedAt: '$updatedAt',
          },
        },
        totalDebit: { $sum: '$debit' },
        totalCredit: { $sum: '$credit' },
      },
    },
    {
      $sort: {
        '_id.date': -1,
        '_id.id': 1,
        '_id.reference': 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: {
      data: transactions,
      dateRange: {
        startDate: start,
        endDate: end,
      },
    },
  });
});

module.exports = {
  getProfitAndLoss,
  getProfitAndLossPDF,
  getBalanceSheet,
  getSalesByCustomer,
  getSalesBySalesPerson,
  getSalesByItem,
  getCustomerBalances,
  getCustomerBalanceSummary,
  getReceivableSummary,
  getReceivableDetails,
  getInvoiceDetails,
  getDCDetails,
  getQuotesDetails,
  getPaymentsReceived,
  getVendorBalanceSummary,
  getProcurementPayableSummary,
  getPayrollPayableSummary,
  getPayableDetails,
  getTimeToPay,
  getExpenseDetails,
  getExpenseByCategory,
  getExpenseByCustomer,
  getExpenseByVendor,
  getMovementOfEquity,
  getCashFlowStatement,
  getCashFlowStatementPDF,
  getTrialBalance,
  getGeneralLedger,
  getDetailedGeneralLedger,
  getAccountTransactions,
  getAccountTypeSummary,
  getJournals,
};
