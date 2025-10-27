const mongoose = require('mongoose');

const AccountDetailSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    accountCode: {
      type: String,
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { _id: false }
);

const BalanceSheetItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'othercurrentasset',
        'currentasset',
        'cashandbank',
        'fixedasset',
        'stock',
        'currentliability',
        'othercurrentliability',
        'longtermliability',
        'ownersequity',
      ],
    },
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    accountName: [AccountDetailSchema],
  },
  { _id: false }
);

const BalanceSheetSchema = new mongoose.Schema(
  {
    id: {
      type: String,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    items: [BalanceSheetItemSchema],
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
  },
  { timestamps: true }
);

BalanceSheetSchema.index({ organization: 1, startDate: 1, endDate: 1 });
BalanceSheetSchema.index({ organization: 1, createdAt: -1 });

BalanceSheetSchema.pre('save', async function (next) {
  if (!this.isNew) return next();

  // Get current date to extract year, month, and day
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().slice(-2); // last 2 digits
  const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // 01-12
  const day = String(currentDate.getDate()).padStart(2, '0'); // 01-31

  // Calculate the first and last day of the current month
  const monthInt = currentDate.getMonth(); // 0-based
  const fullYear = currentDate.getFullYear();
  const monthStart = new Date(fullYear, monthInt, 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(fullYear, monthInt + 1, 1, 0, 0, 0, 0);

  // serial number will start from 1 every month
  const srNo =
    (await mongoose.model('BalanceSheet').countDocuments({
      organization: this.organization,
      createdAt: {
        $gte: monthStart,
        $lt: nextMonthStart,
      },
    })) + 1 || 1;

  const paddedSrNo = String(srNo).padStart(3, '0');

  // Format the ID as BS-YY-MM-DD-SRNo
  this.id = `BS-${year}-${month}-${day}-${paddedSrNo}`;

  return next();
});

module.exports = mongoose.model('BalanceSheet', BalanceSheetSchema);
