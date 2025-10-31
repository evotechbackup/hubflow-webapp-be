const mongoose = require('mongoose');

// Define the schema for calendar events
const TaskSchema = new mongoose.Schema(
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
      type: String,
    },
    color: {
      type: String,
    },
    priority: {
      type: String,
    },
    agent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
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
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    status: {
      type: String,
      default: 'pending',
    },
    due: {
      type: Date,
      default: Date.now,
    },
    tags: [{
      type: String,
    }],
    tagColor: {
      type: String,
    },
    taskGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskGroup',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Task', TaskSchema);
