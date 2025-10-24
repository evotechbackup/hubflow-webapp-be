const mongoose = require('mongoose');

const CRMAccountsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['lead', 'contact'],
      default: 'lead',
    },
    leads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leads',
      },
    ],
    contacts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CRMContacts',
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
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

CRMAccountsSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CRMAccounts', CRMAccountsSchema);
