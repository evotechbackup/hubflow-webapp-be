const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const RFQSchema = new mongoose.Schema(
  {
    issuer: String,
    vendor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
      },
    ],
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
        quantity: {
          type: Number,
        },
        type: {
          type: String,
        },
      },
    ],
    id: {
      type: String,
      required: true,
    },
    date: Date,
    notes: String,
    termsNCondition: String,
    type: String,
    approvalComment: String,
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
    //   ref: "ProjectOrder",
    // },
    status: {
      type: String,
      default: 'pending',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
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

RFQSchema.index({ id: 1, organization: 1 }, { unique: true });

RFQSchema.index({ organization: 1 });

RFQSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('RFQ', RFQSchema);
