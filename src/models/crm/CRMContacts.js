const mongoose = require('mongoose');

const CRMContactsSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    fullName: {
      type: String,
    },
    displayName: {
      type: String,
    },
    email: {
      type: String,
    },
    companyName: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    customerType: {
      type: String,
      enum: ['individual', 'business'],
    },
    isCustomer: {
      type: Boolean,
      default: false,
    },
    industry: {
      type: String,
    },
    region: {
      type: String,
    },
    source: {
      type: String,
    },
    description: {
      type: String,
    },
    website: {
      type: String,
    },
    alternatePhone: {
      type: String,
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CRMAccounts',
    },
    pipelineStatus: {
      type: String,
      enum: [
        'new',
        'prospect',
        'proposal',
        'closed',
        'rejected',
        'noanswer',
        'callback',
        'pending',
        'junk',
      ],
      default: 'new',
    },
    assignedTo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],

    comments: [
      {
        comment: {
          type: String,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    logs: [
      {
        status: {
          type: String,
          default: 'new',
        },
        agent: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Agent',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },

    files: [
      {
        name: {
          type: String,
          default: '',
        },
        filename: {
          type: String,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
        },
        notify: {
          type: Boolean,
          default: false,
        },
        expiryDate: {
          type: Date,
        },
        reminderDate: {
          type: Date,
        },
      },
    ],
  },
  { timestamps: true }
);

CRMContactsSchema.index({
  organization: 1,
});

module.exports = mongoose.model('CRMContacts', CRMContactsSchema);
