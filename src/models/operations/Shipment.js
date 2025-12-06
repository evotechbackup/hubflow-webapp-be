const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
      type: ObjectId,
      ref: 'Vendor',
    },

    invoiceId: String,
    invoiceRef: { type: ObjectId, ref: 'Invoice' },
    invoiceAmount: Number,
    invoiceCreated: { type: Boolean, default: false },

    purchaseId: String,
    purchaseRef: { type: ObjectId, ref: 'PurchaseOrder' },
    purchaseAmount: Number,

    purchaseInvoiceId: String,
    purchaseInvoiceRef: { type: ObjectId, ref: 'Bill' },
    purchaseInvoiceAmount: Number,
  },
  { _id: false }
);

const ShipmentSchema = new Schema(
  {
    jobId: { type: ObjectId, ref: 'Job' },

    // container/consignment
    containers: [
      {
        containerType: String,
        containerNo: String,
        numberOfPackages: Number,
        package: String,
        numberOfPallet: Number,
        actualSeal: String,
        grossWeight: Number,
        grossWeightUnit: String,
        netWeight: Number,
        netWeightUnit: String,
        volumeWeight: Number,
        volumeWeightUnit: String,
        totalWeight: Number,
        totalWeightUnit: String,
        volume: Number,
        volumeUnit: String,
        chargeableUnit: String,
        hsCode: String,
        containerRemarks: String,
        hsDescription: String,
        marksNumbers: String,
        goodsDescription: String,
      },
    ],

    // Remarks
    remarks: String,
    terms: String,

    // Exchange rate
    fromCurrency: String,
    fromCurrencyCode: String,
    toCurrency: String,
    toCurrencyCode: String,
    exchangeRate: Number,

    // costing
    booking: {
      type: ObjectId,
      ref: 'Booking',
    },
    items: [ItemSchema],
    id: { type: String },
    date: { type: Date, default: Date.now },

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
ShipmentSchema.index({ id: 1, organization: 1 }, { unique: true });
ShipmentSchema.index({ organization: 1 });

ShipmentSchema.plugin(mongoosePaginate);

// auto assign id
ShipmentSchema.pre('save', async function (next) {
  if (!this.id) {
    // BL-YYYY-MM-DD-totalcountoftodayshipments
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const count = await mongoose.model('Shipment').countDocuments({
      organization: this.organization,
      createdAt: {
        $gte: new Date(year, month - 1, day),
        $lt: new Date(year, month - 1, parseInt(day) + 1),
      },
    });
    this.id = `BL-${year}-${month}-${day}-${count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Shipment', ShipmentSchema);
