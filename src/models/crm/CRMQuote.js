const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const CRMQuoteSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CRMCustomer",
    },
    contactPerson: {
      type: String,
      default: "",
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    subject: {
      type: String,
    },
    rfqNumber: {
      type: String,
    },
    description: {
      type: String,
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        itemsId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Service",
        },
        productName: {
          type: String,
        },
        unit: {
          type: String,
          default: null,
        },
        rfqDescription: {
          type: String,
        },
        price: {
          type: String,
        },
        quantity: {
          type: Number,
        },
        discount: {
          type: Number,
        },
        amount: {
          type: String,
        },
        type: {
          type: String,
        },
      },
    ],

    id: {
      type: String,
    },

    date: {
      type: Date,
    },

    total: {
      type: Number,
    },

    subtotal: {
      type: Number,
    },

    tax: {
      type: Number,
    },
    discount: {
      type: Number,
    },
    notes: {
      type: String,
    },
    termsNCondition: {
      type: String,
    },

    paid: {
      type: Boolean,
    },
    paymentMethod: {
      type: String,
    },
    type: {
      type: String,
    },
    status: {
      type: String,
      default: "pending",
    },

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    valid: {
      type: Boolean,
      default: true,
    },
    approval: {
      type: String,
      default: "pending",
    },
    acceptStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", "submitted", "notsubmitted"],
      default: "pending",
    },
    docAttached: {
      type: String,
    },
    deal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Deal",
    },
  },
  { timestamps: true }
);

CRMQuoteSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("CRMQuote", CRMQuoteSchema);
