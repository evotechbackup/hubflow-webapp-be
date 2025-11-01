const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    sku: String,
    productName: String,
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    productDescription: String,
    tags: [String],
    dateAdded: {
      type: Date,
      default: Date.now,
    },
    price: {
      type: String,
      default: '',
    },
    costPrice: {
      type: String,
      default: '',
    },
    inWarehouseQuantity: {
      type: Number,
      default: 0,
    },
    thumbnail: {
      type: String,
    },
    mediaName: [String],
    weight: String,
    width: String,
    height: String,
    length: String,
    description: String,
    salesAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    purchaseAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    inventoryAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    manufacturer: {
      type: String,
    },
    brand: {
      type: String,
    },
    upc: {
      type: String,
    },
    ean: {
      type: String,
    },
    mpn: {
      type: String,
    },
    isbn: {
      type: String,
    },
    unit: {
      type: String,
    },
    openingStock: {
      type: Number,
      default: 0,
    },
    openingStockRate: {
      type: Number,
      default: 0,
    },
    reorderPoint: {
      type: Number,
      default: 0,
    },
    stockOnHand: {
      type: Number,
      default: 0,
    },
    commitedStock: {
      type: Number,
      default: 0,
    },
    mrq: {
      type: Number,
      default: 0,
    },
    mrqCheckbox: {
      type: Boolean,
      default: false,
    },
    quantityToBeShipped: {
      type: Number,
      default: 0,
    },
    quantityToBeReceived: {
      type: Number,
      default: 0,
    },
    quantityToBeInvoiced: {
      type: Number,
      default: 0,
    },
    quantityToBeBilled: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['OutOfStock', 'Available', 'Limited'],
    },
    files: [
      {
        name: {
          type: String,
          default: '',
        },
        filename: {
          type: String,
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
        },
        notify: {
          type: Boolean,
          default: false,
        },
        expiryDate: {
          type: Date,
        },
        reminderDate: {
          type: Date,
        },
      },
    ],
    inventoryType: {
      type: String,
    },
    rentalType: {
      type: String,
      enum: ['vehicle', 'equipment'],
    },
    rentType: {
      type: String,
      enum: ['own', 'rental'],
      default: 'own',
    },
    odometerReading: {
      type: Number,
    },
    odometerReadingDate: {
      type: Date,
      default: Date.now,
    },
    mobilizedHoursPerDay: {
      type: Number,
      default: 8,
    },
    invoiceHourlyRate: {
      type: Number,
      default: 0,
    },
    invoiceDailyRate: {
      type: Number,
      default: 0,
    },
    invoiceMonthlyRate: {
      type: Number,
      default: 0,
    },
    poHourlyRate: {
      type: Number,
      default: 0,
    },
    poDailyRate: {
      type: Number,
      default: 0,
    },
    poMonthlyRate: {
      type: Number,
      default: 0,
    },
    code: {
      type: String,
    },
    serialNumber: {
      type: String,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
    },
    rack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rack',
    },
    storeRow: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreRow',
    },
    storeAddedDate: {
      type: Date,
    },
    deliveryDate: {
      type: Date,
    },
    openingTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
