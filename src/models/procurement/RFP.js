const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const RFPSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
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
        budget: {
          type: Number,
        },
        description: {
          type: String,
        },
        remarks: {
          type: String,
        },
      },
    ],
    otherItems: [
      {
        productName: {
          type: String,
        },
        quantity: {
          type: Number,
        },
        budget: {
          type: Number,
        },
        unit: {
          type: String,
          default: null,
        },
        description: {
          type: String,
        },
        remarks: {
          type: String,
        },
      },
    ],
    id: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
    },
    requiredDate: {
      type: Date,
    },
    notes: {
      type: String,
    },
    type: {
      type: String,
    },
    approvalComment: {
      type: String,
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
    priorityStatus: {
      type: String,
      enum: ['flexible', 'medium', 'important'],
      default: 'flexible',
    },
    rfqCreated: {
      type: Boolean,
      default: false,
    },
    poCreated: {
      type: Boolean,
      default: false,
    },
    expenseType: {
      type: String,
      enum: [
        'goods',
        'service',
        'materials',
        'consumables',
        'equipments',
        'vehicles',
      ],
    },
    purpose: {
      type: String,
    },
    docAttached: {
      type: String,
    },
  },
  { timestamps: true }
);

RFPSchema.index({ id: 1, organization: 1 }, { unique: true });

RFPSchema.index({ organization: 1 });

RFPSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('RFP', RFPSchema);
