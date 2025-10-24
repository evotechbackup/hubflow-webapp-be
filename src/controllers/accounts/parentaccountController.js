const { default: mongoose } = require('mongoose');
const ParentAccount = require('../../models/accounts/ParentAccount');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/errors');

const accountTypes = {
  asset: [
    'othercurrentasset',
    'currentasset',
    'stock',
    'fixedasset',
    'cashandbank',
  ],
  liability: ['currentliability', 'othercurrentliability', 'longtermliability'],
  equity: ['ownersequity'],
  income: ['income', 'otherincome', 'indirectincome'],
  expense: ['expense', 'costofgoodssold', 'otherexpense', 'indirectexpense'],
};

// Create a new parent account
const createParentAccount = asyncHandler(async (req, res) => {
  const {
    accountName,
    accountType,
    accountCode,
    description,
    company,
    organization,
  } = req.body;
  const newParentAccount = new ParentAccount({
    accountName,
    accountType,
    accountCode,
    description,
    company,
    organization,
  });
  const savedParentAccount = await newParentAccount.save();
  res.status(201).json({
    success: true,
    message: 'Parent Account created successfully',
    data: savedParentAccount,
  });
});

const getPipeline = (orgid, accountType) => {
  return [
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        accountType: { $in: accountTypes[accountType] },
      },
    },
    {
      $lookup: {
        from: 'accounts',
        localField: 'childAccounts',
        foreignField: '_id',
        as: 'childAccounts',
        pipeline: [
          {
            $project: {
              amount: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$childAccounts',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$_id',
        totalAmount: { $sum: { $ifNull: ['$childAccounts.amount', 0] } },
        accountName: { $first: '$accountName' },
        accountCode: { $first: '$accountCode' },
        childAccounts: { $push: '$childAccounts' },
      },
    },
    {
      $sort: { accountType: 1, accountName: 1 },
    },
  ];
};

const getAllParentAccounts = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const groupedAccounts = Object.fromEntries(
    Object.keys(accountTypes).map((type) => [
      type,
      { totalParentAccounts: 0, totalChildAccounts: 0, totalAmount: 0 },
    ])
  );

  const allParentAccounts = await Promise.all(
    Object.keys(accountTypes).map((accountType) =>
      ParentAccount.aggregate(getPipeline(orgid, accountType))
    )
  );

  allParentAccounts.forEach((parentAccounts, index) => {
    const accountType = Object.keys(accountTypes)[index];
    groupedAccounts[accountType].totalParentAccounts = parentAccounts.length;
    groupedAccounts[accountType].totalChildAccounts = parentAccounts.reduce(
      (sum, account) => sum + (account.childAccounts?.length || 0),
      0
    );
    groupedAccounts[accountType].totalAmount = parentAccounts.reduce(
      (sum, account) => sum + account.totalAmount,
      0
    );
  });

  // const vatAccounts = await Promise.all([
  //   Account.findOne({ organization: orgid, accountName: "Input VAT" }),
  //   Account.findOne({ organization: orgid, accountName: "Output VAT" }),
  //   Account.findOne({ organization: orgid, accountName: "VAT Receivable" }),
  //   Account.findOne({ organization: orgid, accountName: "VAT Payable" }),
  // ]);

  // const [inputVat, outputVat, vatReceivable, vatPayable] = vatAccounts;

  // groupedAccounts.asset.totalAmount -= vatReceivable?.amount || 0;
  // groupedAccounts.liability.totalAmount -=
  //   (vatPayable?.amount || 0) + (outputVat?.amount || 0);

  // const vatBalance = (inputVat?.amount || 0) - (outputVat?.amount || 0);
  // if (vatBalance > 0) {
  //   groupedAccounts.asset.totalAmount -= outputVat?.amount || 0;
  // } else if (vatBalance < 0) {
  //   groupedAccounts.liability.totalAmount += vatBalance;
  // }

  res.status(200).json({
    success: true,
    message: 'Parent accounts fetched successfully',
    data: groupedAccounts,
  });
});

const getParentAccountsByTypes = asyncHandler(async (req, res) => {
  const { orgid } = req.params;
  const query = [
    'currentasset',
    'othercurrentasset',
    'cashandbank',
    'fixedasset',
    'currentliability',
    'ownersequity',
    'income',
    'expense',
    'costofgoodssold',
  ];
  const accounts = await ParentAccount.find({
    accountType: { $in: query },
    organization: orgid,
  }).sort({
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
    message: 'Parent accounts fetched',
    data: parentAccounts,
  });
});

// Get all parent accounts for an organization for a specific account type with total amount sum of child accounts
const getParentAccountsByAccountTypes = asyncHandler(async (req, res) => {
  const { orgid, accountType } = req.params;
  const pipeline = [
    {
      $match: {
        organization: new mongoose.Types.ObjectId(orgid),
        accountType: { $in: accountTypes[accountType] },
      },
    },
    {
      $lookup: {
        from: 'accounts',
        localField: 'childAccounts',
        foreignField: '_id',
        as: 'childAccounts',
        pipeline: [
          {
            $project: {
              amount: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$childAccounts',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '$_id',
        totalAmount: { $sum: '$childAccounts.amount' },
        accountName: { $first: '$accountName' },
        accountCode: { $first: '$accountCode' },
        childAccounts: { $push: '$childAccounts' },
      },
    },
    {
      $sort: { accountType: 1, accountName: 1 },
    },
  ];
  const parentAccounts = await ParentAccount.aggregate(pipeline);
  res.status(200).json({
    success: true,
    message: 'Parent accounts fetched',
    data: parentAccounts,
  });
});

// Get a specific parent account by ID
const getParentAccountById = asyncHandler(async (req, res) => {
  const parentAccount = await ParentAccount.findById(req.params.id).populate(
    'childAccounts'
  );
  if (!parentAccount) {
    throw new NotFoundError('Parent account not found');
  }
  res.status(200).json({
    success: true,
    message: 'Parent Account fetched',
    data: parentAccount,
  });
});

// Update a parent account
const addChildAccount = asyncHandler(async (req, res) => {
  const updatedParentAccount = await ParentAccount.findByIdAndUpdate(
    req.params.id,
    { $push: { childAccounts: req.params.childAccountId } },
    { new: true }
  );
  if (!updatedParentAccount) {
    throw new NotFoundError('Parent account not found');
  }
  res.status(200).json({
    success: true,
    message: 'Child account added',
    data: updatedParentAccount,
  });
});

// removechildaccount
const removeChildAccount = asyncHandler(async (req, res) => {
  const updatedParentAccount = await ParentAccount.findByIdAndUpdate(
    req.params.id,
    { $pull: { childAccounts: req.params.childAccountId } },
    { new: true }
  );
  if (!updatedParentAccount) {
    throw new NotFoundError('Parent account not found');
  }
  res.status(200).json({
    success: true,
    message: 'Child account removed',
    data: updatedParentAccount,
  });
});

const exportAccountsData = asyncHandler(async (req, res) => {
  const { orgid, accountType } = req.params;

  const parentAccounts = await ParentAccount.find({
    organization: orgid,
    accountType: { $in: accountTypes[accountType] },
  })
    .populate('childAccounts')
    .lean();

  if (!parentAccounts || parentAccounts.length === 0) {
    throw new NotFoundError('Parent account not found');
  }

  // Prepare the data for Excel
  const excelData = {
    parentAccounts: parentAccounts.map((parent) => ({
      accountName: parent.accountName,
      accountCode: parent.accountCode,
      accountNumber: parent.accountNumber,
      childAccounts: parent.childAccounts.map((child) => ({
        accountName: child.accountName,
        accountCode: child.accountCode,
        amount: child.amount,
      })),
    })),
  };

  res.json({
    success: true,
    message: 'Excel Data fetched',
    data: excelData,
  });
});

module.exports = {
  createParentAccount,
  getAllParentAccounts,
  getParentAccountsByTypes,
  getParentAccountsByAccountTypes,
  getParentAccountById,
  addChildAccount,
  removeChildAccount,
  exportAccountsData,
};
