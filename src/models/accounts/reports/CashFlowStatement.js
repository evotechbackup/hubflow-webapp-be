const mongoose = require('mongoose');

const accountDetailSchema = new mongoose.Schema(
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

const cashFlowActivitySchema = new mongoose.Schema(
  {
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    accountDetails: [accountDetailSchema],
  },
  { _id: false }
);

const cashFlowStatementSchema = new mongoose.Schema(
  {
    id: {
      type: String,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    operating: {
      type: cashFlowActivitySchema,
      required: true,
      default: () => ({ total: 0, accountDetails: [] }),
    },
    investing: {
      type: cashFlowActivitySchema,
      required: true,
      default: () => ({ total: 0, accountDetails: [] }),
    },
    financing: {
      type: cashFlowActivitySchema,
      required: true,
      default: () => ({ total: 0, accountDetails: [] }),
    },
    netCashFlow: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

cashFlowStatementSchema.index({ organization: 1, startDate: 1, endDate: 1 });
cashFlowStatementSchema.index({ organization: 1, createdAt: -1 });

cashFlowStatementSchema.pre('save', async function (next) {
  this.netCashFlow =
    Number(this.operating.total) +
    Number(this.investing.total) +
    Number(this.financing.total);

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
    (await mongoose.model('CashFlowStatement').countDocuments({
      organization: this.organization,
      createdAt: {
        $gte: monthStart,
        $lt: nextMonthStart,
      },
    })) + 1 || 1;

  const paddedSrNo = String(srNo).padStart(3, '0');

  // Format the ID as CF-YY-MM-DD-SRNo
  this.id = `CF-${year}-${month}-${day}-${paddedSrNo}`;

  return next();
});

module.exports = mongoose.model('CashFlowStatement', cashFlowStatementSchema);
