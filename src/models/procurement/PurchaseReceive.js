const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const PurchaseReceiveSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    contactPerson: {
      type: String,
      default: '',
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
    id: {
      type: String,
      required: true,
    },
    approvalComment: {
      type: String,
    },
    receivedDate: {
      type: Date,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        itemsId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Service',
        },
        fleetId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InventoryFleet',
        },
        unit: {
          type: String,
          default: null,
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
        productName: {
          type: String,
        },
        type: {
          type: String,
        },
        received: {
          type: Number,
        },
        balance: {
          type: Number,
        },
        inTransit: {
          type: Number,
        },
        addToInventory: {
          type: Boolean,
          default: false,
        },
      },
    ],
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    notes: {
      type: String,
    },
    termsCondition: {
      type: String,
    },
    status: {
      type: String,
      default: 'received',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    // order: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'ProjectOrder',
    // },
    valid: {
      type: Boolean,
      default: true,
    },
    approval: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'pending',
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    approvedAt1: {
      type: Date,
    },
    approvedAt2: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: {
      type: Date,
    },
    docAttached: {
      type: String,
    },
  },
  { timestamps: true }
);

PurchaseReceiveSchema.index({ id: 1, organization: 1 }, { unique: true });

PurchaseReceiveSchema.index({ organization: 1 });

PurchaseReceiveSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('PurchaseReceive', PurchaseReceiveSchema);
