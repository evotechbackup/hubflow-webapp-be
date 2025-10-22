const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
  feature: {
    type: String,
  },
  reviewed: {
    type: Boolean,
    default: true,
  },
  verified: {
    type: Boolean,
    default: true,
  },
  acknowledged: {
    type: Boolean,
    default: true,
  },
  // correction: {
  //   type: Boolean,
  //   default: true,
  // },
  // rejected: {
  //   type: Boolean,
  //   default: true,
  // },
  approved1: {
    type: Boolean,
    default: true,
  },
  approved2: {
    type: Boolean,
    default: true,
  },
});

const ApprovalManagement = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },
  approval: [approvalSchema],
});

module.exports = mongoose.model('ApprovalManagement', ApprovalManagement);
