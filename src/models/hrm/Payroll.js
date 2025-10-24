const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: '',
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    employeeName: {
      type: String,
      default: '',
    },
    salary: {
      type: Number,
      required: true,
    },
    overtimePay: {
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
    totalPay: {
      type: Number,
      default: 0,
    },
    allowance: {
      type: Number,
      default: 0,
    },
    deduction: {
      type: Number,
      default: 0,
    },
    fromGroupPayroll: {
      type: Boolean,
      default: false,
    },
    type: {
      enum: ['full', 'advance', 'timesheet', 'projecttimesheet', 'loan'],
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
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
      },
    ],
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    salaryAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    numberOfMonths: {
      type: Number,
      default: 1,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    approvedBy1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedBy: {
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
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: {
      type: Date,
    },
    voucherCreated: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    approvalComment: {
      type: String,
    },
  },
  { timestamps: true }
);

PayrollSchema.pre('save', async function (next) {
  if (!this.isNew) throw next();

  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2); // Get last 2 digits of year
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Get month (1-12) and pad with zero

  let employeeID = '001';
  if (this.employeeId) {
    try {
      const employee = await mongoose
        .model('Employee')
        .findById(this.employeeId, 'employeeId');
      if (employee && employee.employeeId) {
        employeeID = employee.employeeId;
      }
    } catch (error) {
      console.error('Error fetching employee ID:', error);
    }
  }

  // Format the ID as IND-PYR-YY-MM-EMPID
  this.id = `IND-PYR-${year}-${month}-${employeeID}`;

  next();
});

PayrollSchema.index({ id: 1, organization: 1 }, { unique: true });

PayrollSchema.index({ organization: 1 });

module.exports = mongoose.model('Payroll', PayrollSchema);
