const mongoose = require('mongoose');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const ShippingBillSchema = new Schema(
  {
    shipmentId: { type: ObjectId, ref: 'Shipment' },

    boeType: String,
    statusCode: String,
    boeNo: String,
    boeDate: Date,
    declarationNo: String,
    declarationDate: Date,
    accountType: String,
    accountNo: String,
    currency: String,
    currencyAmount: Number,
    mateReceiptNo: String,
    mateReceiptDate: Date,
    noOfPieces: Number,
    packType: String,
    grossWeight: Number,
    grossWeightUnit: String,
    volume: Number,
    customerOrderNo: String,
    transportArticleNo: String,
    transportQuantity: Number,
    hsCommodityCode: String,
    commodityDescription: String,
    supplierName: String,
    poNo: String,
    date: Date,
    trackingDetails: String,
    remarks: String,

    company: { type: ObjectId, ref: 'Company' },
    organization: { type: ObjectId, ref: 'Organization' },
    user: { type: ObjectId, ref: 'User' },
    valid: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    // Optimize queries by converting to plain JS objects when not modifying
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
ShippingBillSchema.index({ organization: 1 });

module.exports = mongoose.model('ShippingBill', ShippingBillSchema);
