const mongoose = require('mongoose');

const EmployeeCampSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    employees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
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

EmployeeCampSchema.index({
  organization: 1,
});

module.exports = mongoose.model('EmployeeCamp', EmployeeCampSchema);
