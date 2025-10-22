const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { APPROVAL_STATUSES } = require('../../utils/constants');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

// Item subdocument schema
const ItemSchema = new Schema(
  {
    productName: String,
    unit: String,
    quantity: Number,
    description: String,
  },
  { _id: false }
);

const EnquirySchema = new Schema(
  {
    customer: { type: ObjectId, ref: 'Customer' },
    contactPerson: String,
    items: [ItemSchema],
    id: { type: String, required: true },
    date: Date,
    reference: String,
    subject: String,
    description: String,
    notes: String,
    termsNCondition: String,
    approvalComment: String,
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
  },
  {
    timestamps: true,
    // Optimize queries by converting to plain JS objects when not modifying
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
EnquirySchema.index({ id: 1, organization: 1 }, { unique: true });
EnquirySchema.index({ organization: 1 });

EnquirySchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Enquiry', EnquirySchema);
