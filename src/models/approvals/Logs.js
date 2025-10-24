const mongoose = require('mongoose');

const LogsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionId: {
      type: String,
    },
    action: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
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

const Logs = mongoose.model('Logs', LogsSchema);
module.exports = Logs;
