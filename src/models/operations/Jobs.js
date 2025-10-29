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
  },
  { _id: false }
);

const JobSchema = new Schema(
  {
    shipmentType: String,
    customer: { type: ObjectId, ref: 'Customer' },
    contactPerson: String,

    // Job info
    carrier: String,
    mblNo: String,
    mblDate: Date,
    vesselName: String,
    voyageNo: String,
    deliveryAgent: String,
    placeOfReceipt: String,
    por: String,
    pol: String,
    pod: String,
    pof: String,
    placeOfDelivery: String,
    etd: Date,
    eta: Date,
    crossTrade: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no',
    },
    incoterm: String,
    freight: String,
    serviceType: String,
    payableAt: String,
    dispatchAt: String,
    isHazardous: {
      type: String,
      enum: ['yes', 'no'],
      default: 'no',
    },
    remarks: String,
    salesperson: String,
    shipper: String,
    consignee: String,
    internalRemarks: String,

    // container/consignment
    containerType: String,
    containerNo: String,
    numberOfPackages: Number,
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
JobSchema.index({ id: 1, organization: 1 }, { unique: true });
JobSchema.index({ organization: 1 });

JobSchema.plugin(mongoosePaginate);

// auto assign id
JobSchema.pre('save', async function (next) {
  if (!this.id) {
    // JOB-YYYY-MM-DD-totalcountoftodayjobs
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const count = await mongoose.model('Job').countDocuments({
      organization: this.organization,
      createdAt: {
        $gte: new Date(year, month - 1, day),
        $lt: new Date(year, month - 1, parseInt(day) + 1),
      },
    });
    this.id = `JOB-${year}-${month}-${day}-${count + 1}`;
  }
  next();
});

module.exports = mongoose.model('Job', JobSchema);
