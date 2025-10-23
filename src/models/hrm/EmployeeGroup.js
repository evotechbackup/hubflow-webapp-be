const mongoose = require("mongoose");

const DivisionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
    },
    employees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],
  },
  { timestamps: true }
);

const EmployeeGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
    },
    type: {
      type: String,
      enum: ["own", "freelancer", "rental"],
      default: "own",
    },
    division: [
      {
        type: DivisionSchema,
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

EmployeeGroupSchema.index({
  organization: 1,
});

module.exports = mongoose.model("EmployeeGroup", EmployeeGroupSchema);
