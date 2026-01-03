const mongoose = require('mongoose');

const EmployeeTargetsSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    startDate: Date,
    endDate: Date,
    noOfDays: Number,
    targets: [
      {
        name: {
          type: String,
          enum: [
            'prospect',
            'proposal',
            'closed',
            'meetingbooked',
            'quotation',
            'invoice',
          ],
        },
        count: {
          type: Number,
        },
        value: {
          type: Number,
        },
      },
    ],
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

module.exports = mongoose.model('EmployeeTargets', EmployeeTargetsSchema);
