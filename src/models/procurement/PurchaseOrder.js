const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const PurchaseOrderSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    contactPerson: {
      type: String,
      default: '',
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
        productName: {
          type: String,
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
        type: {
          type: String,
        },
        description: {
          type: String,
        },
      },
    ],
    id: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
    },
    date: {
      type: Date,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    paymentTerms: {
      type: String,
    },
    shipmentPreferences: {
      type: String,
    },
    notes: {
      type: String,
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
    freightCharges: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    termsCondition: {
      type: String,
    },
    incoTerms: {
      type: String,
    },
    document: {
      type: String,
    },
    status: {
      type: String,
      default: 'pending',
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
    docAttached: {
      type: String,
    },
    approvalComment: {
      type: String,
    },
    valid: {
      type: Boolean,
      default: true,
    },
    paymentStatus: {
      type: String,
      default: 'pending',
    },
    amountDue: {
      type: Number,
      default: 0,
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    inspectionRequired: {
      type: Boolean,
      default: false,
    },
    inspectionReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseInspectionReport',
    },
    inspectionPassed: {
      type: Boolean,
      default: false,
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
    advancePayment: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
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
    newProductCategory: {
      type: String,
    },
    itemsFromInventory: {
      type: Boolean,
      default: true,
    },
    priorityStatus: {
      type: String,
      enum: ['flexible', 'medium', 'important'],
      default: 'flexible',
    },
    subject: {
      type: String,
    },
    referenceDate: {
      type: Date,
    },
    rfpId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RFP',
    },
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ id: 1, organization: 1 }, { unique: true });

PurchaseOrderSchema.index({ organization: 1 });

PurchaseOrderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
