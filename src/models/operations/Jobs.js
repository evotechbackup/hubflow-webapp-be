const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const { Schema } = mongoose;
const { ObjectId } = Schema.Types;

const JobSchema = new Schema(
  {
    shipmentType: String,
    customer: { type: ObjectId, ref: 'Customer' },
    contactPerson: String,

    shipments: [{ type: ObjectId, ref: 'Shipment' }],

    // Shipment info
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

    id: { type: String },
    date: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['open', 'closed', 'pending', 'incomplete'],
      default: 'open',
    },
    closingDate: { type: Date },

    company: { type: ObjectId, ref: 'Company' },
    organization: { type: ObjectId, ref: 'Organization' },
    user: { type: ObjectId, ref: 'User' },
    valid: { type: Boolean, default: true },
    invoiceCreated: { type: Boolean, default: false },
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
