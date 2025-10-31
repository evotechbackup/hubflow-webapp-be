const { asyncHandler } = require('../../middleware');
const BankBranchMaster = require('../../models/master/BankBranchMaster');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const getAllBankBranchMaster = asyncHandler(async (req, res) => {
  const { orgid } = req.params;

  const bankBranchMasters = await BankBranchMaster.find({
    organization: orgid,
  });

  res.status(200).json({
    success: true,
    message: 'Bank Branches retrieved successfully',
    data: bankBranchMasters,
  });
});

const getBankBranchMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bankBranchMaster = await BankBranchMaster.findById(id);

  if (!bankBranchMaster) {
    throw new NotFoundError('Bank Branch not found');
  }

  res.status(200).json({
    success: true,
    message: 'Bank Branch retrieved successfully',
    data: bankBranchMaster,
  });
});

const createBankBranchMaster = asyncHandler(async (req, res) => {
  const {
    code,
    accountName,
    bankName,
    accountNumber,
    iBANNumber,
    branchName,
    organization,
    company,
  } = req.body;

  if (!accountName || !bankName || !organization) {
    throw new ValidationError(
      'Account Name, Bank Name and Organization are required'
    );
  }

  const bankBranchMaster = await BankBranchMaster.create({
    code,
    accountName,
    bankName,
    accountNumber,
    iBANNumber,
    branchName,
    organization,
    company,
  });

  res.status(201).json({
    success: true,
    message: 'Bank Branch created successfully',
    data: bankBranchMaster,
  });
});

const updateBankBranchMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  const bankBranchMaster = await BankBranchMaster.findById(id);

  if (!bankBranchMaster) {
    throw new NotFoundError('Bank Branch not found');
  }

  const updatedBankBranchMaster = await BankBranchMaster.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Bank Branch updated successfully',
    data: updatedBankBranchMaster,
  });
});

const deleteBankBranchMaster = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const bankBranchMaster = await BankBranchMaster.findById(id);

  if (!bankBranchMaster) {
    throw new NotFoundError('Bank Branch not found');
  }

  await BankBranchMaster.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Bank Branch deleted successfully',
  });
});

module.exports = {
  getAllBankBranchMaster,
  getBankBranchMaster,
  createBankBranchMaster,
  updateBankBranchMaster,
  deleteBankBranchMaster,
};
