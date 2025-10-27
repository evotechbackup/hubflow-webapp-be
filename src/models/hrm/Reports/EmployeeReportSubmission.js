const mongoose = require('mongoose');

const EmployeeReportSubmissionSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeReport',
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeDepartment',
    },
    role: {
      type: String,
      required: true,
    },
    inspectionDate: {
      type: Date,
      default: Date.now,
    },
    lat: {
      type: Number,
    },
    lng: {
      type: Number,
    },
    answers: [
      {
        question: {
          type: String,
        },
        questionType: {
          type: String,
        },
        answer: [
          {
            type: String,
          },
        ],
        comment: {
          type: String,
        },
        photo: {
          type: String,
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'EmployeeReportSubmission',
  EmployeeReportSubmissionSchema
);
