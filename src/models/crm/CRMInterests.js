const mongoose = require("mongoose");

const CRMInterestsSchema = new mongoose.Schema(
  {
    interest: [
      {
        name: {
          type: String,
          default: "",
        },
        type: {
          type: String,
          enum: ["project", "product", "services", "items", "properties"],
        },
        project: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Projects",
        },
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Products",
        },
        services: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Services",
        },
        items: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CRMItems",
        },
        properties: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "CRMProperties",
        },
      },
    ],

    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Leads",
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CRMContacts",
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

CRMInterestsSchema.index({
  organization: 1,
});

module.exports = mongoose.model("CRMInterests", CRMInterestsSchema);
