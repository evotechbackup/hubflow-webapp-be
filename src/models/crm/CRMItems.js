const mongoose = require('mongoose');

const CRMItemsSchema = new mongoose.Schema(
  {
    sku: String,
    productName: String,
    description: String,
    tags: [String],
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
          default: Date.now, // Set the default value to the current date
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
    code: {
      type: String,
    },
    serialNumber: {
      type: String,
    },
    // rack: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Rack',
    // },
  },
  { timestamps: true }
);

const CRMItems = mongoose.model('CRMItems', CRMItemsSchema);

module.exports = CRMItems;
