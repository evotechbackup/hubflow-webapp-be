const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const PaymentMadeSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    contactPerson: {
      type: String,
      default: '',
    },
    id: {
      type: String,
      required: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    paymentMode: {
      type: String,
    },
    paidThrough: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    billsData: [
      {
        date: {
          type: Date,
        },
        billNo: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Bill',
        },
        purchaseOrder: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PurchaseOrder',
        },
        billAmount: {
          type: Number,
        },
        dueAmount: {
          type: Number,
        },
        payment: {
          type: Number,
        },
      },
    ],
    notes: {
      type: String,
    },
    termsCondition: {
      type: String,
    },
    amountPaid: {
      type: Number,
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
    totalBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'pending',
    },
    paymentFromPO: {
      type: Boolean,
      default: false,
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
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
      },
    ],
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
    approvalComment: {
      type: String,
    },
    costCenter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CostCenter',
    },
    docAttached: {
      type: String,
    },
    expenseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
  },
  {
    timestamps: true,
  }
);

PaymentMadeSchema.index({ id: 1, organization: 1 }, { unique: true });

PaymentMadeSchema.index({ organization: 1 });

PaymentMadeSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('PaymentMade', PaymentMadeSchema);
