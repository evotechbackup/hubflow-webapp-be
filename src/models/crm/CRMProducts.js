const mongoose = require("mongoose");

const CRMProductsSchema = new mongoose.Schema(
  {
    product: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
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

CRMProductsSchema.index({
  organization: 1,
});

module.exports = mongoose.model("CRMProducts", CRMProductsSchema);
