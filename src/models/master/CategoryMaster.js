const mongoose = require('mongoose');

const CategoryMasterSchema = new mongoose.Schema(
  {
    code: String,
    name: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    tableName: {
      type: String,
      enum: ['asset', 'organization'],
      default: 'asset',
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

CategoryMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CategoryMaster', CategoryMasterSchema);
