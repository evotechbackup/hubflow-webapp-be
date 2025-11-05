const mongoose = require("mongoose");

const CRMPropertiesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      min: 3,
    },
    thumbnail: {
      type: String,
      default: "",
    },
    media: [
      {
        type: String,
        default: "",
      },
    ],
    units: {
      type: String,
      default: "",
    },
    startingPrice: {
      type: String,
      default: "",
    },
    descriptor: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    lat: {
      type: String,
      default: "",
    },
    lng: {
      type: String,
      default: "",
    },
    projectType: {
      type: String,
      enum: ["primary", "secondary", ""],
      default: "",
    },
    area: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "",
    },
    handOver: {
      type: String,
      default: "",
    },
    amenities: [
      {
        type: String,
        default: "",
      },
    ],
    documents: [
      {
        name: {
          type: String,
          default: "",
        },
        filename: {
          type: String,
          default: "",
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    developer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Developer",
    },
    agent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CRMProperties", CRMPropertiesSchema);
