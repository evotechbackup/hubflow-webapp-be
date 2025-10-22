const mongoose = require('mongoose');

const ClauseMasterSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    description: String,
    carrier: String,
    clauseType: String,
    stampIdentifier: String,
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

ClauseMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('ClauseMaster', ClauseMasterSchema);
