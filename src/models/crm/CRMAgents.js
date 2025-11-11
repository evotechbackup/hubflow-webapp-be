const mongoose = require('mongoose');

const CRMAgentsSchema = new mongoose.Schema(
  {
    department: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmployeeDepartment',
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
  { timestamps: true }
);

CRMAgentsSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CRMAgents', CRMAgentsSchema);
