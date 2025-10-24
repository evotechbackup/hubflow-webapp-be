const { default: mongoose } = require('mongoose');
const Account = require('../../models/accounts/Account');
const CategoryOfAccounts = require('../../models/accounts/CategoryOfAccounts');
const Transaction = require('../../models/accounts/Transaction');
const ParentAccount = require('../../models/accounts/ParentAccount');
const { createActivityLog } = require('../../utils/logUtils');
const dayjs = require('dayjs');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const createAccount = asyncHandler(async (req, res) => {
  const {
    accountType,
    accountName,
    subAccount,
    parentAccount = null,
    accountCode,
    costCenter,
    accountNumber,
    currency,
    description,
    watchList,
    company,
    organization,
  } = req.body;

  const account = new Account({
    accountName,
    subAccount,
    groupAccount: parentAccount || null,
    accountNumber,
    currency,
    costCenter,
    description,
    watchList,
    accountType,
    company,
    organization,
  });

  const savedAccount = await account.save();

  if (parentAccount !== null) {
    const parent = await ParentAccount.findById(parentAccount);
    const lastID = parent.childAccounts[parent.childAccounts.length - 1];
    const lastAccount = await Account.findById(lastID).select('-embedding');
    const split = lastAccount.accountCode.split('-');
    const lastAccountNumber = split[split.length - 1];
    const newAccountNumber = (parseInt(lastAccountNumber) + 1)
      .toString()
      .padStart(2, '0');
    account.accountCode = `${parent.accountCode}-${newAccountNumber}`;
    parent.childAccounts.push(savedAccount._id);
    await parent.save();
    await account.save();
  } else {
    account.accountCode = accountCode;
    await account.save();
  }

  try {
    await savedAccount.generateEmbedding();
  } catch (error) {
    console.error('Error generating embedding for account:', error);
  }

  await createActivityLog({
    userId: req._id,
    action: 'create',
    type: 'account',
    actionId: savedAccount.accountName,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: savedAccount,
  });
});

const addCategory = asyncHandler(async (req, res) => {
  const { name, accountType, accounts, company, organization } = req.body;
  const category = new CategoryOfAccounts({
    name,
    accountType,
    accounts,
    company,
    organization,
  });
  const savedCategory = await category.save();

  await createActivityLog({
    userId: req._id,
    action: 'create',
    type: 'categoryOfAccounts',
    actionId: savedCategory.name,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: savedCategory,
  });
});

const getAccountsForInvoicePaymentReceived = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    organization: orgid,
    accountType: 'cashandbank',
    status: true, //fetching activate accounts
  })
    .select('-embedding')
    .sort({
      accountType: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

const getReceivablesNPayables = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const months = Array.from({ length: 12 }, (_, i) =>
    dayjs().month(i).format('MMM')
  );

  // Helper: Initialize month-wise map
  const initMonthlyMap = () => {
    return months.reduce((acc, month) => {
      acc[month] = 0;
      return acc;
    }, {});
  };

  // Helper: Sum monthly data from transactions or accounts
  const getMonthlyData = async (filter) => {
    const accounts = await Account.find({
      organization: orgid,
      ...filter,
    }).select('-embedding');
    const monthlyMap = initMonthlyMap();
    accounts.forEach((acc) => {
      if (acc.amount && acc.createdAt) {
        const month = dayjs(acc.createdAt).format('MMM');
        if (monthlyMap[month] !== undefined) {
          monthlyMap[month] += acc.amount;
        }
      }
    });
    return monthlyMap;
  };

  const accountsReceivable = await ParentAccount.findOne({
    organization: orgid,
    accountName: 'Accounts Receivable',
  }).populate('childAccounts');
  const accountsPayable = await ParentAccount.findOne({
    organization: orgid,
    accountName: 'Accounts Payable',
  }).populate('childAccounts');
  const pettyCash = await Account.findOne({
    organization: orgid,
    accountName: 'Petty Cash Account',
  }).select('-embedding');

  const pettyCashData = await getMonthlyData({
    accountName: 'Petty Cash Account',
  });

  // Assets
  const assetsFilter = {
    accountType: {
      $in: [
        'othercurrentasset',
        'currentasset',
        'fixedasset',
        'stock',
        'cashandbank',
      ],
    },
    accountName: { $ne: 'VAT Receivable' },
  };
  const accountsAssets = await Account.find({
    organization: orgid,
    ...assetsFilter,
  }).select('-embedding');
  let totalAsset = accountsAssets?.reduce(
    (acc, item) => acc + (Number(item.amount) || 0),
    0
  );
  const accountsAssetsData = await getMonthlyData(assetsFilter);

  // Liabilities
  const liabilitiesFilter = {
    accountType: {
      $in: [
        'currentliability',
        'creditcard',
        'longtermliability',
        'othercurrentliability',
      ],
    },
    accountName: { $nin: ['VAT Payable', 'Output VAT'] },
  };
  const accountsLiabilities = await Account.find({
    organization: orgid,
    ...liabilitiesFilter,
  }).select('-embedding');
  let totalLiabilities = accountsLiabilities?.reduce(
    (acc, item) => acc + (Number(item.amount) || 0),
    0
  );
  const accountsLiabilitiesData = await getMonthlyData(liabilitiesFilter);

  // VAT Adjustments
  const inputVat = await Account.findOne({
    organization: orgid,
    accountName: 'Input VAT',
  }).select('-embedding');
  const outputVat = await Account.findOne({
    organization: orgid,
    accountName: 'Output VAT',
  }).select('-embedding');
  const vatBalance = (inputVat?.amount || 0) - (outputVat?.amount || 0);

  if (vatBalance > 0) {
    totalAsset -= outputVat?.amount || 0;
  } else if (vatBalance < 0) {
    totalLiabilities += vatBalance;
  }

  // Equity
  const equityFilter = {
    accountType: 'ownersequity',
    accountName: { $ne: 'Drawings' },
  };
  const accountsEquity = await Account.find({
    organization: orgid,
    ...equityFilter,
  }).select('-embedding');
  const totalEquity = accountsEquity?.reduce(
    (acc, item) => acc + (Number(item.amount) || 0),
    0
  );
  const accountsEquityData = await getMonthlyData(equityFilter);

  // Response
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: {
      accountsReceivable:
        accountsReceivable?.childAccounts.reduce(
          (acc, item) => acc + (Number(item.amount) || 0),
          0
        ) || 0,
      accountsReceivableData: {},
      accountsPayables:
        accountsPayable?.childAccounts.reduce(
          (acc, item) => acc + (Number(item.amount) || 0),
          0
        ) || 0,
      accountsPayablesData: {},
      accountsAssets: totalAsset || 0,
      accountsAssetsData,
      accountsLiabilities: totalLiabilities || 0,
      accountsLiabilitiesData,
      accountsEquity: totalEquity || 0,
      accountsEquityData,
      pettyCash: pettyCash?.amount || 0,
      pettyCashData,
    },
  });
});

const getIncomeNExpenseAccounts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  // Get the current year
  const currentYear = new Date().getFullYear();
  const start = new Date(currentYear, 0, 1); // Start of the year
  const end = new Date(currentYear, 11, 31, 23, 59, 59, 999); // End of the year

  // Define the account types we're interested in
  const incomeTypes = ['income', 'otherincome', 'indirectincome'];
  const expenseTypes = [
    'expense',
    'costofgoodssold',
    'otherexpense',
    'indirectexpense',
  ];
  const allTypes = [...incomeTypes, ...expenseTypes];

  // Fetch all relevant accounts in one query
  const accounts = await Account.find({
    accountType: { $in: allTypes },
    organization: orgid,
  }).select('-embedding');

  const accountIds = accounts.map((account) => account._id);

  // Fetch all transactions for these accounts and group by month
  const transactions = await Transaction.aggregate([
    {
      $match: {
        account: { $in: accountIds },
        createdAt: {
          $gte: start,
          $lte: end,
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' },
          account: '$account',
        },
        totalDebit: { $sum: '$debit' },
        totalCredit: { $sum: '$credit' },
      },
    },
  ]);

  // Initialize an object to store monthly totals
  const monthlyData = {};

  // Iterate over the aggregated transactions and calculate monthly totals
  transactions.forEach((transaction) => {
    const { month } = transaction._id;

    if (!monthlyData[month]) {
      monthlyData[month] = {
        income: 0,
        expense: 0,
      };
    }

    const account = accounts.find((acc) =>
      acc._id.equals(transaction._id.account)
    );
    const amount = transaction.totalDebit - transaction.totalCredit;

    if (incomeTypes.includes(account.accountType)) {
      monthlyData[month].income += amount;
    } else if (expenseTypes.includes(account.accountType)) {
      monthlyData[month].expense += amount;
    }
  });

  // Return the monthly data
  res.status(200).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: monthlyData,
  });
});

const getTopIncomeExpenseLiability = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const incomeTypes = ['income', 'otherincome', 'indirectincome'];
  const assetTypes = [
    'currentasset',
    'fixedasset',
    'stock',
    'othercurrentasset',
    'cashandbank',
  ];
  const liabilityTypes = [
    'currentliability',
    'longtermliability',
    'othercurrentliability',
  ];

  const topincomeAccounts = await Account.find({
    organization: orgid,
    accountType: { $in: incomeTypes },
  })
    .select('accountName accountType amount')
    .sort({ amount: -1 })
    .limit(3)
    .lean();

  const topAssets = await Account.find({
    organization: orgid,
    accountType: { $in: assetTypes },
  })
    .select('accountName accountType amount')
    .sort({ amount: -1 })
    .limit(5)
    .lean();

  const liabilityAccount = await Account.find({
    organization: orgid,
    accountType: { $in: liabilityTypes },
  })
    .select('accountName accountType amount')
    .sort({ amount: -1 })
    .limit(5)
    .lean();

  const receivableAccount = await ParentAccount.findOne({
    organization: orgid,
    accountName: 'Accounts Receivable',
  }).populate('childAccounts');

  const payableAccount = await ParentAccount.findOne({
    organization: orgid,
    accountName: 'Accounts Payable',
  }).populate('childAccounts');

  const receivablePayableData = [
    {
      accountName: 'Accounts Receivable',
      amount:
        receivableAccount?.childAccounts.reduce(
          (acc, item) => acc + (Number(item.amount) || 0),
          0
        ) || 0,
    },
    {
      accountName: 'Accounts Payable',
      amount:
        payableAccount?.childAccounts.reduce(
          (acc, item) => acc + (Number(item.amount) || 0),
          0
        ) || 0,
    },
  ];

  res.status(200).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: {
      incomeAccount: topincomeAccounts,
      assetsAccount: topAssets,
      liabilityAccounts: liabilityAccount,
      receivablePayable: receivablePayableData,
    },
  });
});

const getTopExpenseAccounts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const account = await Account.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        accountType: 'expense',
      },
    },
    {
      $sort: {
        amount: -1,
      },
    },
    {
      $limit: 5,
    },
    {
      $project: {
        accountName: 1,
        amount: 1,
      },
    },
  ]);

  const value = account?.map((item) => Number(item?.amount?.toFixed(2)));
  const labels = account?.map((item) => item?.accountName);

  res.status(200).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: {
      value,
      labels,
    },
  });
});

const monthlyCashFlowStatement = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const currentYear = new Date().getFullYear();

  // Define the mapping of account types to cash flow activities
  const query = {
    operating: [
      'income',
      'otherincome',
      'indirectincome',
      'expense',
      'costofgoodssold',
      'otherexpense',
      'indirectexpense',
      'cashandbank',
    ],
    investing: ['fixedasset', 'stock', 'currentasset'],
    financing: ['ownersequity', 'longtermliability', 'currentliability'],
  };

  // Combine all account types into a single array
  const accountTypes = [
    ...query.operating,
    ...query.investing,
    ...query.financing,
  ];

  // Fetch all accounts in a single query
  const accounts = await Account.find({
    accountType: { $in: accountTypes },
    organization: orgid,
    accountName: { $ne: 'Drawings' },
  }).select('-embedding');

  // Fetch all transactions for the retrieved accounts for the entire year
  const accountIds = accounts.map((account) => account._id);
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  const transactions = await Transaction.find({
    account: { $in: accountIds },
    createdAt: {
      $gte: yearStart,
      $lte: yearEnd,
    },
  });

  // Initialize an object to hold the results for each month
  const monthlyResults = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    operating: { total: 0, accountDetails: [] },
    investing: { total: 0, accountDetails: [] },
    financing: { total: 0, accountDetails: [] },
  }));

  // Group transactions by month and account
  const transactionsByMonthAndAccount = transactions.reduce(
    (acc, transaction) => {
      const month = transaction.createdAt.getMonth();
      const accountId = transaction.account.toString();

      if (!acc[month]) acc[month] = {};
      if (!acc[month][accountId]) acc[month][accountId] = [];

      acc[month][accountId].push(transaction);
      return acc;
    },
    {}
  );

  // Calculate totals for each activity type for each month
  accounts.forEach((account) => {
    monthlyResults.forEach((monthResult, monthIndex) => {
      const accountTransactions =
        (transactionsByMonthAndAccount[monthIndex] &&
          transactionsByMonthAndAccount[monthIndex][account._id.toString()]) ||
        [];

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

        monthResult[activityType].total += totalAmount;
        monthResult[activityType].accountDetails.push({
          name: account.accountName,
          accountCode: account.accountCode,
          total: totalAmount,
        });
      }
    });
  });

  // Calculate the total for each month
  const monthlyTotals = monthlyResults.map((monthResult) => ({
    month: monthResult.month,
    total:
      Number(monthResult.operating.total) +
      Number(monthResult.investing.total) +
      Number(monthResult.financing.total),
  }));

  res.status(200).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: monthlyTotals,
  });
});

const getAccountsForPCR = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    accountType: 'cashandbank',
    organization: orgid,
    status: true,
  })
    .select('-embedding')
    .sort({
      accountName: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

const getAccountsForExpense = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    accountType: {
      $in: ['costofgoodssold', 'expense', 'indirectexpense', 'otherexpense'],
    },
    organization: orgid,
    status: true,
  })
    .select('-embedding')
    .sort({
      accountType: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

const getAccountsForIncome = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    accountType: {
      $in: ['income', 'otherincome', 'indirectincome'],
    },
    organization: orgid,
    status: true,
  })
    .select('-embedding')
    .sort({
      accountType: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

const getAccountsForExpensePaidThrough = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    accountType: {
      $in: ['currentasset', 'fixedasset', 'cashandbank', 'othercurrentasset'],
    },
    organization: orgid,
    status: true,
    accountName: { $ne: 'Drawings' },
  })
    .select('-embedding')
    .sort({
      accountType: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

const getAccountsForInventoryAdjustment = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    accountType: {
      $in: [
        'costofgoodssold',
        'expense',
        'indirectexpense',
        'fixedasset',
        'cashandbank',
        'currentasset',
        'othercurrentasset',
        'income',
        'indirectincome',
        'ownersequity',
        'currentliability',
        'othercurrentliability',
      ],
    },
    organization: orgid,
    status: true,
    accountName: { $ne: 'Drawings' },
  })
    .select('-embedding')
    .sort({
      accountType: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

const getAccountsByType = asyncHandler(async (req, res) => {
  const { accountType, orgid } = req.params;
  if (accountType === '0') {
    const accountTypeOrder = [
      'cashandbank',
      'currentasset',
      'fixedasset',
      'stock',
      'othercurrentasset',
      'currentliability',
      'longtermliability',
      'othercurrentliability',
      'ownersequity',
      'income',
      'otherincome',
      'indirectincome',
      'expense',
      'otherexpense',
      'indirectexpense',
      'costofgoodssold',
    ];

    const accountTypeOrderMap = new Map(
      accountTypeOrder.map((type, index) => [type, index])
    );

    const accounts = await Account.find({
      organization: orgid,
      status: true,
    })
      .select('-embedding')
      .lean();

    const inputVat = await Account.findOne({
      accountName: 'Input VAT',
      organization: orgid,
    })
      .select('-embedding')
      .lean();

    const outputVat = await Account.findOne({
      accountName: 'Output VAT',
      organization: orgid,
    })
      .select('-embedding')
      .lean();

    const vatPayable = (outputVat?.amount || 0) - (inputVat?.amount || 0);

    const vatPayableAccount = accounts.find(
      (account) => account.accountName === 'VAT Payable'
    );
    if (vatPayableAccount) {
      vatPayableAccount.amount = vatPayable;
    }

    const vatReceivable = (inputVat?.amount || 0) - (outputVat?.amount || 0);

    const vatReceivableAccount = accounts.find(
      (account) => account.accountName === 'VAT Receivable'
    );
    if (vatReceivableAccount) {
      vatReceivableAccount.amount = vatReceivable;
    }

    const sortedAccounts = accounts.sort((a, b) => {
      const typeOrderA = accountTypeOrderMap.get(a.accountType) ?? Infinity;
      const typeOrderB = accountTypeOrderMap.get(b.accountType) ?? Infinity;

      if (typeOrderA !== typeOrderB) {
        return typeOrderA - typeOrderB;
      }
      return a.accountName.localeCompare(b.accountName);
    });

    res.status(200).json(sortedAccounts);
  } else if (accountType === 'active') {
    const accounts = await Account.find({
      status: true,
      organization: orgid,
    })
      .select('-embedding')
      .sort({
        accountType: 1,
        accountName: 1,
      });
    res.status(201).json(accounts);
  } else if (accountType === 'inactive') {
    const accounts = await Account.find({
      status: false,
      organization: orgid,
    })
      .select('-embedding')
      .sort({
        accountType: 1,
        accountName: 1,
      });
    res.status(201).json(accounts);
  } else {
    let query = [];
    if (accountType === 'asset') {
      query = [
        'currentasset',
        'fixedasset',
        'stock',
        'othercurrentasset',
        'cashandbank',
      ];
    } else if (accountType === 'liability') {
      query = [
        'currentliability',
        'longtermliability',
        'othercurrentliability',
      ];
    } else if (accountType === 'ownersequity') {
      query = ['ownersequity'];
    } else if (accountType === 'income') {
      query = ['income', 'otherincome', 'indirectincome'];
    } else {
      query = ['expense', 'costofgoodssold', 'otherexpense', 'indirectexpense'];
    }
    const accounts = await Account.find({
      accountType: { $in: query },
      organization: orgid,
      status: true,
    })
      .select('-embedding')
      .sort({
        accountName: 1,
      });

    if (accountType === 'liability') {
      const inputVat = await Account.findOne({
        accountName: 'Input VAT',
        organization: orgid,
      })
        .select('-embedding')
        .lean();

      const outputVat = await Account.findOne({
        accountName: 'Output VAT',
        organization: orgid,
      })
        .select('-embedding')
        .lean();

      const vatPayable = outputVat.amount - inputVat.amount;

      accounts.find((account) => account.accountName === 'VAT Payable').amount =
        vatPayable;
    } else if (accountType === 'asset') {
      const inputVat = await Account.findOne({
        accountName: 'Input VAT',
        organization: orgid,
      })
        .select('-embedding')
        .lean();

      const outputVat = await Account.findOne({
        accountName: 'Output VAT',
        organization: orgid,
      })
        .select('-embedding')
        .lean();

      const vatReceivable = inputVat.amount - outputVat.amount;

      accounts.find(
        (account) => account.accountName === 'VAT Receivable'
      ).amount = vatReceivable;
    }
    res.status(201).json({
      success: true,
      message: 'Accounts fetched successfully',
      data: accounts,
    });
  }
});

const getAccountHierarchy = asyncHandler(async (req, res) => {
  const { orgid, filter } = req.params;

  // Define master account categories and their corresponding account types
  const masterAccountMap = {
    assets: [
      'currentasset',
      'othercurrentasset',
      'fixedasset',
      'stock',
      'cashandbank',
    ],
    liability: [
      'currentliability',
      'othercurrentliability',
      'longtermliability',
    ],
    equity: ['ownersequity'],
    income: ['income', 'otherincome', 'indirectincome'],
    expense: ['expense', 'costofgoodssold', 'otherexpense', 'indirectexpense'],
  };

  // Lookup from accountType to master category for O(1) mapping
  const accountTypeToMaster = Object.entries(masterAccountMap).reduce(
    (map, [master, types]) => {
      types.forEach((t) => (map[t] = master));
      return map;
    },
    {}
  );

  // Prepare query based on filter
  const accountQuery = { organization: orgid };
  if (filter === 'active') {
    accountQuery.status = true;
  } else if (filter === 'inactive') {
    accountQuery.status = false;
  } else if (filter && filter !== '0' && masterAccountMap[filter]) {
    accountQuery.accountType = { $in: masterAccountMap[filter] };
    accountQuery.status = true;
  }

  // Fetch accounts, parents, and VAT balances concurrently with projections
  const [accounts, parentAccounts, inputVat, outputVat] = await Promise.all([
    Account.find(accountQuery)
      .select('_id accountName amount fixed status accountCode accountType')
      .lean(),
    ParentAccount.find({ organization: orgid })
      .select('_id accountName childAccounts')
      .lean(),
    Account.findOne({ accountName: 'Input VAT', organization: orgid })
      .select('amount')
      .lean(),
    Account.findOne({ accountName: 'Output VAT', organization: orgid })
      .select('amount')
      .lean(),
  ]);

  const vatPayable = (outputVat?.amount || 0) - (inputVat?.amount || 0);
  const vatReceivable = (inputVat?.amount || 0) - (outputVat?.amount || 0);

  // Update VAT accounts in the accounts array (in-place)
  const vatPayableAccount = accounts.find(
    (a) => a.accountName === 'VAT Payable'
  );
  if (vatPayableAccount) vatPayableAccount.amount = vatPayable;
  const vatReceivableAccount = accounts.find(
    (a) => a.accountName === 'VAT Receivable'
  );
  if (vatReceivableAccount) vatReceivableAccount.amount = vatReceivable;

  // Create hierarchical structure
  const hierarchicalAccounts = {};

  // If filter is a specific master account, only include that one
  const masterAccountsToInclude =
    filter && masterAccountMap[filter]
      ? [filter]
      : Object.keys(masterAccountMap);

  // Initialize master account categories
  masterAccountsToInclude.forEach((masterAccount) => {
    hierarchicalAccounts[masterAccount] = {
      name: masterAccount.charAt(0).toUpperCase() + masterAccount.slice(1),
      accountTypes: {},
      totalAmount: 0,
    };
  });

  // Create a map of account IDs to their objects for quick lookup
  const accountMap = new Map(accounts.map((acc) => [acc._id.toString(), acc]));

  // Identify child accounts
  const childAccountIds = new Set();
  parentAccounts.forEach((parent) => {
    if (Array.isArray(parent.childAccounts)) {
      parent.childAccounts.forEach((child) => {
        const childId =
          child && typeof child === 'object' && child._id
            ? child._id.toString()
            : child?.toString();
        if (childId) childAccountIds.add(childId);
      });
    }
  });

  // Group non-child accounts under their account types
  for (const account of accounts) {
    const masterAccountKey = accountTypeToMaster[account.accountType];
    if (!masterAccountKey || !hierarchicalAccounts[masterAccountKey]) continue;

    const masterAccount = hierarchicalAccounts[masterAccountKey];
    if (!masterAccount.accountTypes[account.accountType]) {
      masterAccount.accountTypes[account.accountType] = {
        name:
          account.accountType.charAt(0).toUpperCase() +
          account.accountType.slice(1),
        parentAccounts: {},
        others: [],
        totalAmount: 0,
      };
    }

    const accountTypeGroup = masterAccount.accountTypes[account.accountType];

    // Only count non-child accounts here to avoid double-counting
    if (!childAccountIds.has(account._id.toString())) {
      const amt = Number(account.amount) || 0;
      accountTypeGroup.totalAmount += amt;
      masterAccount.totalAmount += amt;
      accountTypeGroup.others.push({
        _id: account._id.toString(),
        name: account.accountName,
        amount: amt,
        fixed: account.fixed || false,
        status: account.status || false,
        accountCode: account.accountCode || '',
      });
    }
  }

  // Process parent accounts and add them to the hierarchy
  parentAccounts.forEach((parent) => {
    if (
      !Array.isArray(parent.childAccounts) ||
      parent.childAccounts.length === 0
    )
      return;

    // Determine the account type based on the first existing child in current query scope
    let sampleChildAccount = null;
    for (const child of parent.childAccounts) {
      const childId =
        child && typeof child === 'object' && child._id
          ? child._id.toString()
          : child?.toString();
      if (!childId) continue;
      const childAccount = accountMap.get(childId);
      if (childAccount) {
        sampleChildAccount = childAccount;
        break;
      }
    }
    if (!sampleChildAccount) return;

    const masterAccountKey =
      accountTypeToMaster[sampleChildAccount.accountType];
    if (!masterAccountKey || !hierarchicalAccounts[masterAccountKey]) return;

    const masterAccount = hierarchicalAccounts[masterAccountKey];
    if (!masterAccount.accountTypes[sampleChildAccount.accountType]) {
      masterAccount.accountTypes[sampleChildAccount.accountType] = {
        name:
          sampleChildAccount.accountType.charAt(0).toUpperCase() +
          sampleChildAccount.accountType.slice(1),
        parentAccounts: {},
        others: [],
        totalAmount: 0,
      };
    }

    const accountTypeGroup =
      masterAccount.accountTypes[sampleChildAccount.accountType];

    // Sum children that are part of the current accounts set
    let parentTotalAmount = 0;
    const children = [];
    parent.childAccounts.forEach((child) => {
      const childId =
        child && typeof child === 'object' && child._id
          ? child._id.toString()
          : child?.toString();
      if (!childId) return;
      const childAccount = accountMap.get(childId);
      if (!childAccount) return;
      const childAmount = Number(childAccount.amount) || 0;
      parentTotalAmount += childAmount;
      children.push({
        _id: childAccount._id.toString(),
        name: childAccount.accountName,
        amount: childAmount,
        fixed: childAccount.fixed || false,
        status: childAccount.status || false,
        accountCode: childAccount.accountCode || '',
      });
    });

    accountTypeGroup.parentAccounts[parent._id.toString()] = {
      _id: parent._id.toString(),
      name: parent.accountName,
      amount: parentTotalAmount,
      children,
    };

    // Totals reflect parents (sum of children) in addition to stand-alone accounts
    accountTypeGroup.totalAmount += parentTotalAmount;
    masterAccount.totalAmount += parentTotalAmount;
  });

  res.status(200).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: hierarchicalAccounts,
  });
});

//get only stocks accounts
const getStockAccounts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    accountType: 'stock',
    organization: orgid,
    status: true,
  })
    .select('-embedding')
    .sort({
      accountName: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

const getStockAndFixedAssetAccounts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    accountType: { $in: ['stock', 'fixedasset'] },
    organization: orgid,
    status: true,
  })
    .select('-embedding')
    .sort({
      accountName: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

const getAccounts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const accounts = await Account.find({
    status: true,
    organization: orgid,
  })
    .select('-embedding')
    .populate('accountType', ['accountType'])
    .sort({
      accountType: 1,
      accountName: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accounts,
  });
});

// get account by id
const getAccountById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const account = await Account.findById(id).select('-embedding');

  if (account.accountName === 'VAT Payable') {
    const inputVat = await Account.findOne({
      organization: account.organization,
      accountName: 'Input VAT',
    }).select('-embedding');
    const outputVat = await Account.findOne({
      organization: account.organization,
      accountName: 'Output VAT',
    }).select('-embedding');

    const balance = outputVat.amount - inputVat.amount;
    account.amount = balance;
  } else if (account.accountName === 'VAT Receivable') {
    const inputVat = await Account.findOne({
      organization: account.organization,
      accountName: 'Input VAT',
    }).select('-embedding');
    const outputVat = await Account.findOne({
      organization: account.organization,
      accountName: 'Output VAT',
    }).select('-embedding');
    const vatReceivable = inputVat.amount - outputVat.amount;
    account.amount = vatReceivable;
  }

  res.status(201).json({
    success: true,
    message: 'Account fetched successfully',
    data: account,
  });
});

const editAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    accountName,
    costCenter,
    subAccount,
    parentAccount,
    accountCode,
    accountNumber,
    currency,
    description,
    watchList,
    status,
  } = req.body;
  const account = await Account.findByIdAndUpdate(
    id,
    {
      $set: {
        accountName,
        costCenter,
        subAccount,
        parentAccount,
        accountCode,
        accountNumber,
        currency,
        description,
        watchList,
        status,
      },
    },
    { new: true }
  );

  try {
    await account.generateEmbedding();
  } catch (error) {
    console.error('Error generating embedding for account:', error);
  }

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'account',
    actionId: account.accountName,
    organization: account.organization,
    company: account.company,
  });

  res.status(201).json({
    success: true,
    message: 'Account updated successfully',
    data: account,
  });
});

const updateCostCenter = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { costCenter } = req.body;
  const account = await Account.findByIdAndUpdate(
    id,
    {
      $set: {
        costCenter,
      },
    },
    { new: true }
  );

  try {
    await account.generateEmbedding();
  } catch (error) {
    console.error('Error generating embedding for account:', error);
  }

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'account',
    actionId: account.accountName,
    organization: account.organization,
    company: account.company,
  });

  res.status(201).json({
    success: true,
    message: 'Account updated successfully',
    data: account,
  });
});

const changeActivation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const account = await Account.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
      },
    },
    { new: true }
  );

  try {
    await account.generateEmbedding();
  } catch (error) {
    console.error('Error generating embedding for account:', error);
  }

  await createActivityLog({
    userId: req._id,
    action: 'update',
    type: 'account',
    actionId: account.accountName,
    organization: account.organization,
    company: account.company,
  });

  res.status(201).json({
    success: true,
    message: 'Account updated successfully',
    data: account,
  });
});

const deleteAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deletedAccount = await Account.findByIdAndDelete(id);

  if (!deletedAccount) {
    throw new NotFoundError('Account not found');
  }
  if (deletedAccount.parentAccount !== null) {
    const parentAccountName = await Account.findById(
      deletedAccount.parentAccount
    ).select('accountName');
    if (parentAccountName) {
      await CategoryOfAccounts.findOneAndUpdate(
        {
          name: parentAccountName.accountName,
        },
        {
          $pull: {
            accounts: id,
          },
        },
        { new: true }
      );
    }
  } else {
    const accounts = await Account.find({
      parentAccount: id,
    }).select('-embedding');
    if (accounts.length > 0) {
      for (let i = 0; i < accounts.length; i++) {
        await Account.findByIdAndUpdate(
          accounts[i]._id,
          {
            $set: {
              parentAccount: null,
            },
          },
          { new: true }
        );
      }
    }
    await CategoryOfAccounts.findOneAndDelete({
      name: deletedAccount.accountName,
    });
  }

  await createActivityLog({
    userId: req._id,
    action: 'delete',
    type: 'account',
    actionId: deletedAccount.accountName,
    organization: deletedAccount.organization,
    company: deletedAccount.company,
  });

  res.status(201).json({
    success: true,
    message: 'Account deleted successfully',
    data: deletedAccount,
  });
});

const getParentAccounts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const query = [
    'currentasset',
    'fixedasset',
    'stock',
    'othercurrentasset',
    'cashandbank',
    'currentliability',
    'longtermliability',
    'othercurrentliability',
    'ownersequity',
    'income',
    'otherincome',
    'indirectincome',
    'expense',
    'costofgoodssold',
    'otherexpense',
    'indirectexpense',
  ];
  const accounts = await Account.find({
    accountType: { $in: query },
    parentAccount: null,
    organization: orgid,
    status: true,
  })
    .select('-embedding')
    .sort({
      accountName: 1,
    });

  const parentAccounts = {};
  query.forEach((type) => {
    parentAccounts[type] = [];
  });
  for (let i = 0; i < accounts.length; i++) {
    parentAccounts[accounts[i].accountType].push({
      id: accounts[i]._id,
      name: accounts[i].accountName,
    });
  }
  res.status(201).json({
    success: true,
    message: 'Parent accounts fetched successfully',
    data: parentAccounts,
  });
});

const getAccountGroupedWithTypes = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const query = [
    'currentasset',
    'fixedasset',
    'stock',
    'othercurrentasset',
    'cashandbank',
    'currentliability',
    'longtermliability',
    'othercurrentliability',
    'ownersequity',
    'income',
    'otherincome',
    'indirectincome',
    'expense',
    'costofgoodssold',
    'otherexpense',
    'indirectexpense',
  ];
  const accounts = await Account.find({
    organization: orgid,
  })
    .select('-embedding')
    .sort({
      accountName: 1,
    });

  const accountList = {};
  query.forEach((type) => {
    accountList[type] = [];
  });
  for (let i = 0; i < accounts.length; i++) {
    accountList[accounts[i].accountType].push({
      value: accounts[i]._id,
      label: accounts[i].accountName,
    });
  }
  res.status(201).json({
    success: true,
    message: 'Accounts fetched successfully',
    data: accountList,
  });
});

const getCategories = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const categories = await CategoryOfAccounts.find({
    organization: orgid,
  })
    .populate('accounts', ['amount'])
    .sort({
      name: 1,
    });
  res.status(201).json({
    success: true,
    message: 'Categories fetched successfully',
    data: categories,
  });
});

const getCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await CategoryOfAccounts.findById(id).populate('accounts');

  res.status(201).json({
    success: true,
    message: 'Category fetched successfully',
    data: category,
  });
});

//route for deleting file from category
const deleteFileFromCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  const { documentId } = req.params;

  const category = await CategoryOfAccounts.findById(categoryId);
  if (!category) {
    throw new NotFoundError('CategoryOfAccounts not found');
  }

  const documentIndex = category.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the category');
  }

  // Remove the document from the client's documents array
  category.files.splice(documentIndex, 1);

  // Save the updated client
  await category.save();

  return res.json({
    success: true,
    message: 'Files deleted successfully',
  });
});

const updateFileInCategory = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  const { documentId } = req.params;
  const { name, notify, expiryDate, reminderDate } = req.body;

  const category = await CategoryOfAccounts.findById(categoryId);
  if (!category) {
    throw new NotFoundError('CategoryOfAccounts not found');
  }

  const documentIndex = category.files.findIndex(
    (doc) => doc._id.toString() === documentId
  );

  if (documentIndex === -1) {
    throw new NotFoundError('Files not found for the category');
  }

  // Update the document details
  category.files[documentIndex].name = name;
  category.files[documentIndex].notify = notify;
  category.files[documentIndex].expiryDate = expiryDate;
  category.files[documentIndex].reminderDate = reminderDate;

  // Save the updated client
  await category.save();

  return res.json({
    success: true,
    message: 'Files updated successfully',
  });
});

// router for fetching files of a category
const getFiles = asyncHandler(async (req, res) => {
  const categoryId = req.params.id;
  const existingCategoryOfAccounts =
    await CategoryOfAccounts.findById(categoryId);
  const documents = existingCategoryOfAccounts.files;
  res.status(200).json({
    success: true,
    message: 'Files fetched successfully',
    data: { documents },
  });
});

// router for fetching statement of accounts of a customer with total invoice amount and payment received amount
const getStatementOfAccountsForCustomerTransaction = asyncHandler(
  async (req, res) => {
    const customerId = req.params.customerid;
    const { orgid } = req.params;
    let { date } = req.query;
    if (date) {
      date =
        date === '1'
          ? new Date().setDate(new Date().getDate() - 1)
          : date === '7'
            ? new Date().setDate(new Date().getDate() - 7)
            : date === '30'
              ? new Date().setDate(new Date().getDate() - 30)
              : date === '90'
                ? new Date().setDate(new Date().getDate() - 90)
                : date === '365'
                  ? new Date().setDate(new Date().getDate() - 365)
                  : new Date().setDate(new Date().getDate() - 1);
    }

    const accountsReceivable = await ParentAccount.findOne({
      accountName: 'Accounts Receivable',
      organization: orgid,
    }).distinct('childAccounts');

    const transactions = await Transaction.find({
      account: { $in: accountsReceivable },
      customer: customerId,
      // debit and credit should be greater than 0
      $or: [{ debit: { $gt: 0 } }, { credit: { $gt: 0 } }],
      createdAt: { $gte: date },
    });

    const leftoverTransactions = await Transaction.find({
      customer: customerId,
      account: {
        $ne: accountsReceivable,
      },
      $or: [{ debit: { $gt: 0 } }, { credit: { $gt: 0 } }],
      createdAt: { $lt: date },
    });

    const invoiceTotal = transactions.reduce((acc, transaction) => {
      return transaction.type === 'invoice'
        ? acc + transaction.debit + transaction.credit
        : acc;
    }, 0);

    const paymentReceivedTotal = transactions.reduce((acc, transaction) => {
      return transaction.type === 'payment receipt'
        ? acc + transaction.debit + transaction.credit
        : acc;
    }, 0);

    // respond with the total invoice amount and payment received amount and transactions
    res.status(200).json({
      success: true,
      message: 'Transactions fetched successfully',
      data: {
        invoiceTotal,
        paymentReceivedTotal,
        transactions: [...transactions, ...leftoverTransactions],
      },
    });
  }
);

const getStatementOfAccountsForCustomer = asyncHandler(async (req, res) => {
  const customerId = req.params.customerid;
  const { orgid } = req.params;
  let { date } = req.query;
  if (date) {
    date =
      date === '1'
        ? new Date().setDate(new Date().getDate() - 1)
        : date === '7'
          ? new Date().setDate(new Date().getDate() - 7)
          : date === '30'
            ? new Date().setDate(new Date().getDate() - 30)
            : date === '90'
              ? new Date().setDate(new Date().getDate() - 90)
              : date === '365'
                ? new Date().setDate(new Date().getDate() - 365)
                : new Date().setDate(new Date().getDate() - 1);
  }

  const accountsReceivable = await ParentAccount.findOne({
    accountName: 'Accounts Receivable',
    organization: orgid,
  }).distinct('childAccounts');

  const transactions = await Transaction.find({
    account: { $in: accountsReceivable },
    customer: customerId,
    // debit and credit should be greater than 0
    $or: [{ debit: { $gt: 0 } }, { credit: { $gt: 0 } }],
    createdAt: { $gte: date },
  });

  const invoiceTotal = transactions.reduce((acc, transaction) => {
    return transaction.type === 'invoice'
      ? acc + transaction.debit + transaction.credit
      : acc;
  }, 0);

  const paymentReceivedTotal = transactions.reduce((acc, transaction) => {
    return transaction.type === 'payment receipt'
      ? acc + transaction.debit + transaction.credit
      : acc;
  }, 0);

  // respond with the total invoice amount and payment received amount and transactions
  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: { invoiceTotal, paymentReceivedTotal, transactions },
  });
});

// router for fetching statement of accounts of a vendor with total purchase order amount and payment made amount
const getStatementOfAccountsForVendorTransaction = asyncHandler(
  async (req, res) => {
    const vendorId = req.params.vendorid;
    const { orgid } = req.params;
    let { date } = req.query;
    if (date) {
      date =
        date === '1'
          ? new Date().setDate(new Date().getDate() - 1)
          : date === '7'
            ? new Date().setDate(new Date().getDate() - 7)
            : date === '30'
              ? new Date().setDate(new Date().getDate() - 30)
              : date === '90'
                ? new Date().setDate(new Date().getDate() - 90)
                : date === '365'
                  ? new Date().setDate(new Date().getDate() - 365)
                  : new Date().setDate(new Date().getDate() - 1);
    }

    const accountsPayable = await ParentAccount.findOne({
      organization: orgid,
      accountName: 'Accounts Payable',
    }).distinct('childAccounts');

    const transactions = await Transaction.find({
      account: { $in: accountsPayable },
      vendor: vendorId,
      // debit and credit should be greater than 0
      $or: [{ debit: { $gt: 0 } }, { credit: { $gt: 0 } }],
      createdAt: { $gte: date },
    });

    const leftoverTransactions = await Transaction.find({
      vendor: vendorId,
      account: { $in: accountsPayable },
      $or: [{ debit: { $gt: 0 } }, { credit: { $gt: 0 } }],
      createdAt: { $lt: date },
    });

    const billTotal = transactions.reduce((acc, transaction) => {
      return transaction.type === 'bill'
        ? acc + transaction.debit + transaction.credit
        : acc;
    }, 0);

    const paymentMadeTotal = transactions.reduce((acc, transaction) => {
      return transaction.type === 'payment made'
        ? acc + transaction.debit + transaction.credit
        : acc;
    }, 0);

    // respond with the total purchase order amount and payment made amount and transactions
    res.status(200).json({
      success: true,
      message: 'Transactions fetched successfully',
      data: {
        billTotal,
        paymentMadeTotal,
        transactions: [...transactions, ...leftoverTransactions],
      },
    });
  }
);

const getStatementOfAccountsForVendor = asyncHandler(async (req, res) => {
  const vendorId = req.params.vendorid;
  const { orgid } = req.params;
  let { date } = req.query;
  if (date) {
    date =
      date === '1'
        ? new Date().setDate(new Date().getDate() - 1)
        : date === '7'
          ? new Date().setDate(new Date().getDate() - 7)
          : date === '30'
            ? new Date().setDate(new Date().getDate() - 30)
            : date === '90'
              ? new Date().setDate(new Date().getDate() - 90)
              : date === '365'
                ? new Date().setDate(new Date().getDate() - 365)
                : new Date().setDate(new Date().getDate() - 1);
  }
  const accountsPayable = await ParentAccount.findOne({
    organization: orgid,
    accountName: 'Accounts Payable',
  }).distinct('childAccounts');
  const transactions = await Transaction.find({
    account: { $in: accountsPayable },
    vendor: vendorId,
    // debit and credit should be greater than 0
    $or: [{ debit: { $gt: 0 } }, { credit: { $gt: 0 } }],
    createdAt: { $gte: date },
  });

  const billTotal = transactions.reduce((acc, transaction) => {
    return transaction.type === 'bill'
      ? acc + transaction.debit + transaction.credit
      : acc;
  }, 0);

  const paymentMadeTotal = transactions.reduce((acc, transaction) => {
    return transaction.type === 'payment made'
      ? acc + transaction.debit + transaction.credit
      : acc;
  }, 0);

  // respond with the total purchase order amount and payment made amount and transactions
  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: {
      billTotal,
      paymentMadeTotal,
      transactions,
    },
  });
});

module.exports = {
  createAccount,
  addCategory,
  getAccountsForInvoicePaymentReceived,
  getReceivablesNPayables,
  getIncomeNExpenseAccounts,
  getTopIncomeExpenseLiability,
  getTopExpenseAccounts,
  monthlyCashFlowStatement,
  getAccountsForPCR,
  getAccountsForExpense,
  getAccountsForIncome,
  getAccountsForExpensePaidThrough,
  getAccountsForInventoryAdjustment,
  getAccountsByType,
  getAccountHierarchy,
  getStockAccounts,
  getStockAndFixedAssetAccounts,
  getAccounts,
  getAccountById,
  editAccount,
  updateCostCenter,
  changeActivation,
  deleteAccount,
  getParentAccounts,
  getAccountGroupedWithTypes,
  getCategories,
  getCategory,
  deleteFileFromCategory,
  updateFileInCategory,
  getFiles,
  getStatementOfAccountsForCustomerTransaction,
  getStatementOfAccountsForCustomer,
  getStatementOfAccountsForVendorTransaction,
  getStatementOfAccountsForVendor,
};
