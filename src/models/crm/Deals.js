const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema(
  {
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leads',
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CRMContacts',
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    id: {
      type: Number,
    },
    name: {
      type: String,
    },
    status: {
      type: String,
      default: 'open',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  { timestamps: true }
);

DealSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastDeal = await this.constructor
      .findOne({
        organization: this.organization,
      })
      .sort({ id: -1 });

    this.id = lastDeal ? lastDeal.id + 1 : 1;
  }
  next();
});

DealSchema.index({
  organization: 1,
});

module.exports = mongoose.model('Deal', DealSchema);
