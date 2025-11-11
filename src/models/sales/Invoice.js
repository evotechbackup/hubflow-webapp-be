const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const ItemSchema = new Schema(
  {
    serviceId: { type: ObjectId, ref: 'Service' },
    itemId: { type: ObjectId, ref: 'Product' },
    fleetId: { type: ObjectId, ref: 'InventoryFleet' },
    productName: String,
    unit: { type: String, default: null },
    price: { type: String },
    quantity: Number,
    discount: Number,
    amount: String,
    type: String,
    description: String,
  },
  { _id: false }
);

const InvoiceSchema = new Schema(
  {
    customer: { type: ObjectId, ref: 'Customer' },
    items: [ItemSchema],
    id: { type: String, required: true },
    date: Date,
    dueDate: Date,
    total: Number,
    subtotal: Number,
    tax: Number,
    notes: String,
    termsNCondition: String,
    lpo: String,
    trn: String,
    orderNo: String,
    paid: Boolean,
    paymentMethod: String,
    type: String,
    approvalComment: String,
    status: String,
    balanceAmount: { type: Number, default: 0 },
    company: { type: ObjectId, ref: 'Company' },
    organization: { type: ObjectId, ref: 'Organization' },
    user: { type: ObjectId, ref: 'User' },
    balance: {
      // for reference in payment received
      type: Number,
      default: 0,
    },
    advance: { type: Number, default: 0 },
    docAttached: { type: String },
    valid: { type: Boolean, default: true },
    costCenter: { type: ObjectId, ref: 'CostCenter' },
    supplyDate: Date,
    invoicePeriod: {
      startDate: Date,
      endDate: Date,
    },
    approval: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'pending',
      index: true,
    },
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: Date,
    acknowledgedBy: { type: ObjectId, ref: 'User' },
    acknowledgedAt: Date,
    verifiedBy: { type: ObjectId, ref: 'User' },
    approvedBy1: { type: ObjectId, ref: 'User' },
    approvedBy2: { type: ObjectId, ref: 'User' },
    verifiedAt: Date,
    approvedAt1: Date,
    approvedAt2: Date,
    paymentReceived: { type: Boolean, default: false },
    depositTo: { type: ObjectId, ref: 'Account' },
    shippingFee: { type: Number, default: 0 },
    lateFees: { type: Number, default: 0 },
    incomeAccount: { type: ObjectId, ref: 'Account' },
    partialStatus: { type: String },
    quotationId: { type: ObjectId, ref: 'Quote' },
    proposalId: { type: ObjectId, ref: 'Proposal' },
    quotationReference: { type: String },
    poDate: Date,
    proformaInvoiceId: { type: ObjectId, ref: 'ProformaInvoice' },

    job: { type: ObjectId, ref: 'Job' },
    shipment: { type: ObjectId, ref: 'Shipment' },
  },
  { timestamps: true }
);

InvoiceSchema.index({ id: 1, organization: 1 }, { unique: true });

InvoiceSchema.index({ organization: 1 });

InvoiceSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Invoice', InvoiceSchema);
