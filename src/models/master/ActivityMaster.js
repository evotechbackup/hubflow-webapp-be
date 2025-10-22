const mongoose = require('mongoose');

const ActivityMasterSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    type: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    department: String,
    previousActivity: String,
    nextActivity: String,
    remarks: String,

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

ActivityMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('ActivityMaster', ActivityMasterSchema);
