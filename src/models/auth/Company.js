const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
    },

    companyLogo: {
      type: String,
    },

    teamSize: {
      type: Number,
    },

    companyEmail: {
      type: String,
    },

    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],

    organization: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
      },
    ],

    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Modules',
      },
    ],

    activeModules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Modules',
      },
    ],

    app: {
      operations: {
        type: Boolean,
        default: false,
      },
      sales: {
        type: Boolean,
        default: false,
      },
      procurement: {
        type: Boolean,
        default: false,
      },
      hrm: {
        type: Boolean,
        default: false,
      },
      inventory: {
        type: Boolean,
        default: false,
      },
      finance: {
        type: Boolean,
        default: false,
      },
      maintenance: {
        type: Boolean,
        default: false,
      },
      crm: {
        type: Boolean,
        default: false,
      },
      wms: {
        type: Boolean,
        default: false,
      },
      recruit: {
        type: Boolean,
        default: false,
      },
      approvals: {
        type: Boolean,
        default: false,
      },
      fleets: {
        type: Boolean,
        default: false,
      },
    },

    units: [
      {
        name: {
          type: String,
        },
        activated: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // subscription
    subscriptionStatus: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    subscriptionPlan: {
      type: String,
      enum: ['standard', 'pro', 'free'],
    },
    stripeCustomerId: {
      type: String,
    },
    stripeSubscriptionId: {
      type: String,
    },
    allowedUsers: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', CompanySchema);
