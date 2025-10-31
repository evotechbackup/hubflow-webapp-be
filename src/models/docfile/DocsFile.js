const mongoose = require("mongoose");

const DocsFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fileSize: { type: String },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocsFolder",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    agents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    lastOpenedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DocsFile", DocsFileSchema);
