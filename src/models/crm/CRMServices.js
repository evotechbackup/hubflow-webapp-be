const mongoose = require("mongoose");

const CRMServicesSchema = new mongoose.Schema(
  {
    service: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
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

CRMServicesSchema.index({
  organization: 1,
});

module.exports = mongoose.model("CRMServices", CRMServicesSchema);
