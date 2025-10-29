const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

// Item subdocument schema
const ItemSchema = new Schema(
  {
    serviceId: { type: ObjectId, ref: 'Service' },
    productName: String,
    unit: String,
    price: Number,
    quantity: Number,
    vat: Number,
    amount: Number,
    description: String,
    cost: Number,
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
  },
  { _id: false }
);

const BookingSchema = new Schema(
  {
    customer: { type: ObjectId, ref: 'Customer' },
    enquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Enquiry',
    },
    quote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotes',
    },
    shipmentType: String,
    contactPerson: String,
    items: [ItemSchema],
    id: { type: String, required: true },
    date: Date,
    reference: String,
    subject: String,
    description: String,
    incoterm: String,
    etd: Date,
    eta: Date,
    payableAt: String,
    dispatchAt: String,
    origin: String,
    destination: String,
    notes: String,
    termsNCondition: String,
    approvalComment: String,
    total: Number,
    subtotal: Number,
    vat: Number,
    discount: Number,
    costTotal: Number,
    costSubtotal: Number,
    costVat: Number,
    costDiscount: Number,
    company: { type: ObjectId, ref: 'Company' },
    organization: { type: ObjectId, ref: 'Organization' },
    status: { type: String, default: 'pending', index: true },
    user: { type: ObjectId, ref: 'User' },
    valid: { type: Boolean, default: true },
    approval: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: 'pending',
      index: true,
    },
    verifiedBy: { type: ObjectId, ref: 'User' },
    approvedBy1: { type: ObjectId, ref: 'User' },
    approvedBy2: { type: ObjectId, ref: 'User' },
    verifiedAt: Date,
    approvedAt1: Date,
    approvedAt2: Date,
    reviewedBy: { type: ObjectId, ref: 'User' },
    reviewedAt: Date,
    acknowledgedBy: { type: ObjectId, ref: 'User' },
    acknowledgedAt: Date,
    docAttached: String,
    jobCreated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
BookingSchema.index({ id: 1, organization: 1 }, { unique: true });
BookingSchema.index({ organization: 1 });

BookingSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Booking', BookingSchema);
