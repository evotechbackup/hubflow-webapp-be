const { default: mongoose } = require('mongoose');
const Account = require('../../models/accounts/Account');
const CostCenter = require('../../models/accounts/CostCenter');
const { createActivityLog } = require('../../utils/logUtils');

const { asyncHandler } = require('../../middleware/errorHandler');

const createCostCenter = asyncHandler(async (req, res) => {
  const {
    code,
    unit,
    group,
    master,
    remarks,
    incharge,
    division,
    project,
    organization,
    company,
  } = req.body;
  const costCenter = new CostCenter({
    code,
    unit,
    group,
    master,
    remarks,
    incharge,
    division,
    project,
    organization,
    company,
  });
  await costCenter.save();

  await createActivityLog({
    userId: req._id,
    action: 'create',
    type: 'costCenter',
    actionId: costCenter.unit,
    organization,
    company,
  });

  return res.status(201).json({
    success: true,
    message: 'Cost Center Created Successfully',
    data: costCenter,
  });
});

const getCostCenters = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const costCenters = await CostCenter.find({
    organization: orgid,
    isDeleted: false,
  })
    .select('unit code incharge master project group')
    .populate('incharge', ['firstName', 'lastName'])
    .populate('master', 'name')
    .populate('group', 'displayName')
    .sort({ createdAt: -1 });
  return res.status(200).json({
    success: true,
    message: 'Cost Centers Fetched Successfully',
    data: costCenters,
  });
});

const getCostCenterUnits = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const costCenters = await CostCenter.find({
    organization: orgid,
    isDeleted: false,
  })
    .select('unit _id')
    .sort({ createdAt: -1 });
  return res.status(200).json({
    success: true,
    message: 'Cost Centers Fetched Successfully',
    data: costCenters,
  });
});

const getAccountsForIncome = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const accounts = await Account.find({
    organization: orgid,
    accountType: 'income',
    // costCenter: { $ne: null },
    status: true,
  })
    .select('-embedding')
    .populate('costCenter', 'unit')
    .sort({
      accountName: 1,
    });

  return res.status(200).json({
    success: true,
    message: 'Accounts Fetched Successfully',
    data: accounts,
  });
});

const getAccountsForExpense = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const accounts = await Account.find({
    organization: orgid,
    accountType: { $in: ['expense', 'costofgoodssold', 'otherexpense'] },
    // costCenter: { $ne: null },
    status: true,
  })
    .select('-embedding')
    // .populate("costCenter", "unit")
    .sort({
      accountName: 1,
    });

  return res.status(200).json({
    success: true,
    message: 'Accounts Fetched Successfully',
    data: accounts,
  });
});

const getAccountsForExpenseAssets = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const accounts = await Account.find({
    organization: orgid,
    accountType: {
      $in: [
        'expense',
        'costofgoodssold',
        'asset',
        'currentasset',
        'othercurrentasset',
        'cashandbank',
        'fixedasset',
        'stock',
      ],
    },
    status: true,
  })
    .select('-embedding')
    // .populate("costCenter", "unit")
    .sort({
      accountName: 1,
    });

  return res.status(200).json({
    success: true,
    message: 'Accounts Fetched Successfully',
    data: accounts,
  });
});

const getAccountsForIncomeWithCostCenter = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const accounts = await Account.find({
    organization: orgid,
    accountType: 'income',
    costCenter: { $ne: null },
    status: true,
  })
    .select('-embedding')
    .populate('costCenter', 'unit')
    .sort({
      accountName: 1,
    });

  return res.status(200).json({
    success: true,
    message: 'Accounts Fetched Successfully',
    data: accounts,
  });
});

const getCostCenterById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const costCenter = await CostCenter.findById(id);

  return res.status(200).json({
    success: true,
    message: 'Cost Center Fetched Successfully',
    data: costCenter,
  });
});

const getCostCenterAnalytics = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const {
    income_details,
    expense_details,
    ledger_details,
    search,
    startDate,
    endDate,
    cost_master,
  } = req.query;

  const createDateFilter = (date) =>
    date ? new Date(new Date(date).setHours(0, 0, 0, 0)) : null;

  const dateFilter = {
    gte: createDateFilter(startDate),
    lte: createDateFilter(endDate)
      ? new Date(new Date(endDate).setHours(23, 59, 59, 999))
      : null,
  };

  const matchCondition = {
    organization: new mongoose.Types.ObjectId(orgid),
    isDeleted: false,
    ...(search && { unit: { $regex: search, $options: 'i' } }),
  };

  if (
    cost_master &&
    cost_master !== 'null' &&
    cost_master !== '' &&
    cost_master !== 'undefined' &&
    cost_master !== undefined
  ) {
    matchCondition.master = new mongoose.Types.ObjectId(cost_master);
  }

  const pipeline = [
    { $match: matchCondition },
    ...(ledger_details === 'true' && dateFilter.gte && dateFilter.lte
      ? [
          {
            $addFields: {
              filteredIncome: {
                $filter: {
                  input: '$income',
                  as: 'incomeItem',
                  cond: {
                    $and: [
                      { $gte: ['$$incomeItem.date', dateFilter.gte] },
                      { $lte: ['$$incomeItem.date', dateFilter.lte] },
                    ],
                  },
                },
              },
              filteredExpense: {
                $filter: {
                  input: '$expense',
                  as: 'expenseItem',
                  cond: {
                    $and: [
                      { $gte: ['$$expenseItem.date', dateFilter.gte] },
                      { $lte: ['$$expenseItem.date', dateFilter.lte] },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              combined: {
                $concatArrays: ['$filteredIncome', '$filteredExpense'],
              },
              totalIncome: 1,
              totalExpense: 1,
              master: 1,
              unit: 1,
            },
          },
          { $unwind: '$combined' },
          {
            $group: {
              _id: {
                master: '$master',
                costCenter: '$unit',
                account: '$combined.account',
              },
              totalAmount: { $sum: '$combined.amount' },
              totalIncome: {
                $sum: {
                  $cond: {
                    if: { $ifNull: ['$combined.invoice', false] },
                    then: '$combined.amount',
                    else: 0,
                  },
                },
              },
              ...(income_details === 'true' && {
                incomeData: {
                  $push: {
                    $cond: {
                      if: { $ifNull: ['$combined.invoice', false] },
                      then: '$combined',
                      else: null,
                    },
                  },
                },
              }),
              ...(expense_details === 'true' && {
                expenseData: {
                  $push: {
                    $cond: {
                      if: {
                        $or: [
                          { $ifNull: ['$combined.purchase', false] },
                          { $ifNull: ['$combined.expense', false] },
                          { $ifNull: ['$combined.payroll', false] },
                        ],
                      },
                      then: '$combined',
                      else: null,
                    },
                  },
                },
              }),
              totalExpense: {
                $sum: {
                  $cond: {
                    if: {
                      $or: [
                        { $ifNull: ['$combined.purchase', false] },
                        { $ifNull: ['$combined.expense', false] },
                        { $ifNull: ['$combined.payroll', false] },
                      ],
                    },
                    then: '$combined.amount',
                    else: 0,
                  },
                },
              },
            },
          },
          {
            $lookup: {
              from: 'accounts',
              localField: '_id.account',
              foreignField: '_id',
              as: 'accountDetails',
              pipeline: [{ $project: { accountName: 1 } }],
            },
          },
          {
            $group: {
              _id: { costCenter: '$_id.costCenter', master: '$_id.master' },
              account: {
                $push: {
                  account: {
                    $arrayElemAt: ['$accountDetails.accountName', 0],
                  },
                  totalAmount: '$totalAmount',
                  totalIncome: '$totalIncome',
                  totalExpense: '$totalExpense',
                  ...(income_details === 'true' && {
                    incomeData: '$incomeData',
                  }),
                  ...(expense_details === 'true' && {
                    expenseData: '$expenseData',
                  }),
                },
              },
              totalAccountCount: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: '$_id.master',
              costCenters: { $push: '$$ROOT' },
              totalCostCenterCount: { $sum: 1 },
              totalAccountCount: { $sum: '$totalAccountCount' },
            },
          },
        ]
      : []),
    {
      $lookup: {
        from: 'costmasters',
        localField: ledger_details === 'true' ? '_id' : 'master',
        foreignField: '_id',
        as: 'master',
      },
    },
    { $unwind: '$master' },
    ...(ledger_details !== 'true'
      ? [
          {
            $group: {
              _id: '$master',
              costCenters: { $push: '$$ROOT' },
            },
          },
          {
            $project: {
              _id: 0,
              master: '$_id',
              costCenters: {
                unit: 1,
                totalIncome: 1,
                totalExpense: 1,
                ...(income_details === 'true' && { income: 1 }),
                ...(expense_details === 'true' && { expense: 1 }),
              },
            },
          },
        ]
      : []),
  ];

  const analytics = await CostCenter.aggregate(pipeline);
  return res.status(200).json({
    success: true,
    message: 'Cost Center Analytics Fetched Successfully',
    data: analytics,
  });
});

const deleteCostCenter = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const costCenter = await CostCenter.findByIdAndUpdate(id, {
    isDeleted: true,
  });

  await createActivityLog({
    userId: req._id,
    action: 'delete',
    type: 'costCenter',
    actionId: costCenter.unit,
    organization: costCenter.organization,
    company: costCenter.company,
  });

  return res.status(200).json({
    success: true,
    message: 'Cost Center Deleted Successfully',
  });
});

const updateCostCenter = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { code, unit, group, master, remarks, incharge, division, project } =
    req.body;
  const costCenter = await CostCenter.findByIdAndUpdate(id, {
    code,
    unit,
    group,
    master,
    remarks,
    incharge,
    division,
    project,
  });

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'costCenter',
    actionId: costCenter.unit,
    organization: costCenter.organization,
    company: costCenter.company,
  });

  return res.status(200).json({
    success: true,
    message: 'Cost Center Updated Successfully',
  });
});

module.exports = {
  createCostCenter,
  getCostCenters,
  getCostCenterAnalytics,
  deleteCostCenter,
  updateCostCenter,
  getCostCenterById,
  getCostCenterUnits,
  getAccountsForIncome,
  getAccountsForExpense,
  getAccountsForExpenseAssets,
  getAccountsForIncomeWithCostCenter,
};
