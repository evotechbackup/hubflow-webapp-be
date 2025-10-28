const mongoose = require('mongoose');

const PurchaseInspectionReportSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseInspectionForm',
      required: true,
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
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
        signature: {
          type: String,
        },
        dateInput: {
          type: String,
        },
      },
    ],
    isPassed: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
  'PurchaseInspectionReport',
  PurchaseInspectionReportSchema
);
