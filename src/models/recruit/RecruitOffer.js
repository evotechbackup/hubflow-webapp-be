const mongoose = require("mongoose");

const RecruitOfferSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecruitmentResponse",
      required: true,
    },
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecruitmentForm",
      required: true,
    },
    jobRole: {
      type: String,
      required: true,
    },
    applicantEmail: {
      type: String,
      required: true,
    },
    applicantName: {
      type: String,
      required: true,
    },
    offerDate: {
      type: Date,
      required: true,
    },
    letterDescription: {
      type: String,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      required: true,
    },
    approval: {
      type: String,
      enum: [
        "none",
        "pending",
        "reviewed",
        "verified",
        "acknowledged",
        "correction",
        "rejected",
        "approved1",
        "approved2",
      ],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
    },
    reviewedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
    },
    verifiedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
    },
    acknowledgedAt: {
      type: Date,
    },
    approvedBy1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
    },
    approvedBy2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
    },
    approvedAt1: {
      type: Date,
    },
    approvedAt2: {
      type: Date,
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    isValid: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

RecruitOfferSchema.index({ organization: 1, company: 1 });

module.exports = mongoose.model("RecruitOffer", RecruitOfferSchema);
