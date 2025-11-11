const mongoose = require('mongoose');
const AddressSchema = new mongoose.Schema({
  attention: {
    type: String,
  },
  country: {
    type: String,
  },
  region: {
    type: String,
  },
  addressLine1: {
    type: String,
  },
  addressLine2: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  postalCode: {
    type: String,
  },
  phone: {
    type: String,
  },
  faxNumber: {
    type: String,
  },
  department: {
    type: String,
  },
  designation: {
    type: String,
  },
});
const ContactPersonSchema = new mongoose.Schema({
  salutation: {
    type: String,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  emailAddress: {
    type: String,
  },
  workPhone: {
    type: String,
  },
  mobile: {
    type: String,
  },
  designation: {
    type: String,
  },
  department: {
    type: String,
  },
});

const CRMCustomerSchema = new mongoose.Schema(
  {
    customerType: {
      type: String,
    },
    comments: [
      {
        text: { type: String, default: ' ' },
        date: { type: Date, default: Date.now },
      },
    ],
    primaryContact: {
      salutation: {
        type: String,
      },
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
    },
    companyName: {
      type: String,
    },
    displayName: {
      type: String,
    },
    vatNumber: {
      type: String,
    },
    emailAddress: {
      type: String,
    },
    contactNumbers: {
      workPhone: {
        type: String,
      },
      mobilePhone: {
        type: String,
      },
    },
    currency: {
      type: String,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    paymentTerms: {
      type: String,
    },

    portalLanguage: {
      type: String,
    },
    document: {
      type: String,
    },
    designation: String,
    department: String,
    billingAddress: AddressSchema,
    shippingAddress: AddressSchema,
    contactPersons: [ContactPersonSchema],
    isActivated: {
      type: Boolean,
      default: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    agent: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    leads: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Leads',
    },
    contacts: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CRMContacts',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CRMCustomer', CRMCustomerSchema);
