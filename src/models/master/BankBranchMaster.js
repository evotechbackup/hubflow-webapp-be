const mongoose = require('mongoose');

const BankBranchMasterSchema = new mongoose.Schema(
  {
    code: String,
    accountName: String,
    bankName: String,
    accountNumber: String,
    iBANNumber: String,
    branchName: String,
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
  },
  { timestamps: true }
);

BankBranchMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('BankBranchMaster', BankBranchMasterSchema);
