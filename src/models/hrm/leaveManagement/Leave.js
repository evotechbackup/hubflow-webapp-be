const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    jobRoleId: {
      type: String,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeDepartment',
      required: true,
    },
    leaveType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveType',
      required: true,
    },
    month: {
      type: String,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approval: {
      type: String,
      enum: [
        'none',
        'pending',
        'reviewed',
        'verified',
        'acknowledged',
        'correction',
        'rejected',
        'approved1',
        'approved2',
      ],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    approvedBy1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt1: {
      type: Date,
    },
    approvedBy2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt2: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: {
      type: Date,
    },
    docAttached: {
      type: String,
    },
    valid: {
      type: Boolean,
      default: true,
    },
    approvalComment: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Leave', LeaveSchema);
