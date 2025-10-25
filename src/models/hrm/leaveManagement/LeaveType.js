const mongoose = require('mongoose');
const { Schema } = mongoose;

const LeaveTypeSchema = new Schema(
  {
    departmentId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmployeeDepartment',
        required: true,
      },
    ],
    description: {
      type: String,
      // required: true,
    },
    leaveType: {
      type: String,
      required: true,
    },
    maxDuration: {
      type: Number,
      required: true,
    },
    leaveApplyCondition: {
      type: String,
      default: 'none',
    },
    valid: {
      type: Boolean,
      default: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  { timestamps: true }
);

// Create and export the LeaveType model
const LeaveType = mongoose.model('LeaveType', LeaveTypeSchema);
module.exports = LeaveType;
