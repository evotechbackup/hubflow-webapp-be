const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: true,
    },
    questionType: {
      type: String,
      enum: [
        'text',
        'date',
        'number',
        'dropdown',
        'meter',
        'yesno',
        'photo',
        'signature',
        'checkbox',
        'multiplechoice',
      ],
      required: true,
    },
    options: [
      {
        type: String,
      },
    ],
    isRequired: {
      type: Boolean,
      default: false,
    },
    isCommentRequired: {
      type: Boolean,
      default: false,
    },
    isPhotoRequired: {
      type: Boolean,
      default: false,
    },
    shortDescription: {
      type: String,
    },
    min: {
      type: Number,
    },
    max: {
      type: Number,
    },
  },
  { timestamps: true }
);

const EmployeeReportFormSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    color: {
      type: String,
    },
    enableLocation: {
      type: Boolean,
      default: false,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeDepartment',
    },
    role: {
      type: String,
    },
    questions: [
      {
        type: QuestionSchema,
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

module.exports = mongoose.model('EmployeeReport', EmployeeReportFormSchema);
