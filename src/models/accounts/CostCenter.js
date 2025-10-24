const mongoose = require('mongoose');

const costCenterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
    },
    unit: {
      // Cost Center Name
      type: String,
      required: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    master: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostMaster',
    },
    remarks: {
      type: String,
    },
    incharge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    division: {
      type: String,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },

    totalIncome: {
      type: Number,
      default: 0,
    },

    totalExpense: {
      type: Number,
      default: 0,
    },

    income: [
      {
        invoice: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Invoice',
        },
        amount: {
          type: Number,
          default: 0,
        },
        invoiceId: {
          type: String,
        },
        account: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    expense: [
      {
        purchase: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PurchaseQuotation',
        },
        expense: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Expense',
        },
        expensevoucher: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ExpenseVoucher',
        },
        payroll: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Payroll',
        },
        amount: {
          type: Number,
          default: 0,
        },
        purchaseId: {
          type: String,
        },
        expenseId: {
          type: String,
        },
        payrollId: {
          type: String,
        },
        account: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Account',
        },
        date: {
          type: Date,
          default: Date.now,
        },
        otherId: {
          type: String,
        },
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
    },
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

costCenterSchema.index({ organization: 1 });

module.exports = mongoose.model('CostCenter', costCenterSchema);
