const mongoose = require('mongoose');

const CRMTasksSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    start: {
      type: Date,
      required: true,
    },
    end: {
      type: Date,
    },
    type: {
      enum: ['task', 'meeting'],
      type: String,
    },
    color: {
      type: String,
    },
    priority: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    description: {
      type: String,
    },
    reminder: {
      type: Date,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    leads: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leads',
    },
    contacts: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CRMContacts',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    status: {
      type: String,
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CRMTasks', CRMTasksSchema);
