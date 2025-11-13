const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const BillsSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    orderNo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseReceive',
    },
    poNo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
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
        fleetId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InventoryFleet',
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
        unit: {
          type: String,
          default: null,
        },
      },
    ],
    id: {
      type: String,
      required: true,
    },
    approvalComment: {
      type: String,
    },
    billDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    subject: {
      type: String,
    },
    paymentTerms: {
      type: String,
    },
    notes: {
      type: String,
    },
    termsCondition: {
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
    totalBalance: {
      type: Number,
      default: 0,
    },
    paymentPercentage: {
      type: Number,
      default: 0,
    },
    paymentAmount: {
      type: Number,
      default: 0,
    },
    totalBalancePaid: {
      type: Number,
      default: 0,
    },
    partialStatus: {
      type: String,
      enum: ['pending', 'partial', 'full'],
      default: 'pending',
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    expenseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
  },
  { timestamps: true }
);

BillsSchema.index({ id: 1, organization: 1 }, { unique: true });

BillsSchema.index({ organization: 1 });

BillsSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Bill', BillsSchema);
