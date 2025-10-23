const mongoose = require('mongoose');

const DivisionMasterSchema = new mongoose.Schema(
  {
    divisionCode: String,
    divisionName: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    remarks: String,

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

DivisionMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('DivisionMaster', DivisionMasterSchema);
