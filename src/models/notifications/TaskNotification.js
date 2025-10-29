const mongoose = require('mongoose');

const TaskNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    reminder: {
      type: Date,
      default: Date.now,
    },
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
    pcr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PCR',
    },
    payroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
    },
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    crmTask: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CRMTasks',
    },
    approval: {
      type: String,
      default: '',
    },
    extraData: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaskNotification', TaskNotificationSchema);
