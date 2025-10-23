const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const EmployeeAuthSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    deactivated: {
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

EmployeeAuthSchema.index({
  employee: 1,
  company: 1,
  organization: 1,
});

EmployeeAuthSchema.pre("save", async function (next) {
  if (!this.isModified("password")) throw new Error("Password not modified");

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

EmployeeAuthSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("EmployeeAuth", EmployeeAuthSchema);
