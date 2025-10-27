const mongoose = require('mongoose');

const EmployeeLedgerSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    ledger: [
      {
        month: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        payrollId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Payroll',
        },
        type: {
          type: String,
          enum: ['full', 'advance', 'timesheet', 'projecttimesheet', 'loan'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  {
    timestamps: true,
  }
);

EmployeeLedgerSchema.index({ organization: 1, employee: 1, 'ledger.month': 1 });

EmployeeLedgerSchema.index(
  {
    organization: 1,
    employee: 1,
    'ledger.month': 1,
  },
  { unique: true }
);

module.exports = mongoose.model('EmployeeLedger', EmployeeLedgerSchema);
