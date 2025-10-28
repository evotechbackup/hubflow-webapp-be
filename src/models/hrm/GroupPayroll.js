const mongoose = require('mongoose');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const GroupPayrollSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    employeeGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeGroup',
    },
    division: {
      type: String,
      default: '',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeDepartment',
    },
    role: {
      type: String,
      default: '',
    },
    recordedTime: [
      {
        employeeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Employee',
        },
        employeeName: {
          type: String,
          default: '',
        },
        role: {
          type: String,
          default: '',
        },
        regular: {
          // Basic salary of Employee not regular hours
          type: Number,
          default: 0,
        },
        ot: {
          type: Number,
          default: 0,
        },
        allowances: [
          {
            label: {
              type: String,
            },
            value: {
              type: Number,
            },
          },
        ],
        allowance: {
          type: Number,
          default: 0,
        },
        deduction: {
          type: Number,
          default: 0,
        },
        advance: {
          type: Number,
          default: 0,
        },
        loan: {
          type: Number,
          default: 0,
        },
        attendanceDeduction: {
          type: Number,
          default: 0,
        },
        salary: {
          type: Number,
          default: 0,
        },
        overtimePay: {
          type: Number,
          default: 0,
        },
      },
    ],
    allowanceColumns: [
      {
        type: String,
        default: '',
      },
    ],
    type: {
      enum: ['full', 'timesheet'],
      type: String,
      required: true,
      default: 'full',
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    month: {
      type: String,
    },
    notes: {
      type: String,
      default: '',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    payrollList: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payroll',
      },
    ],
    approvalStatus: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    salaryAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    approval: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'pending',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    voucherCreated: {
      type: Boolean,
      default: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    approvedAt1: {
      type: Date,
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
    approvalComment: {
      type: String,
    },
  },
  { timestamps: true }
);

GroupPayrollSchema.index({
  organization: 1,
});

GroupPayrollSchema.index({ id: 1, organization: 1 }, { unique: true });

GroupPayrollSchema.pre('save', async function (next) {
  if (!this.isNew) return next();

  // Get current date to extract year and month
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2); // Get last 2 digits of year
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Get month (1-12) and pad with zero

  // Get count of existing group payrolls for this month and year to generate serial number
  const count = await mongoose.model('GroupPayroll').countDocuments({
    organization: this.organization,
  });

  // Generate 5 digit serial number padded with zeros
  const serialNumber = String(count + 1).padStart(5, '0');

  // Format the ID as GRP-PYR-YY-MM-SERIAL
  this.id = `GRP-PYR-${year}-${month}-${serialNumber}`;

  return next();
});

module.exports = mongoose.model('GroupPayroll', GroupPayrollSchema);
