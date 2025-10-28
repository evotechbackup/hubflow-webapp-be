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
    signature: {
      type: Boolean,
      default: false,
    },
    dateInput: {
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

const PurchaseInspectionFormSchema = new mongoose.Schema(
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

module.exports = mongoose.model(
  'PurchaseInspectionForm',
  PurchaseInspectionFormSchema
);
