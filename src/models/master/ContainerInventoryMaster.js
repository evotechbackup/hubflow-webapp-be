const mongoose = require('mongoose');

const ContainerInventoryMasterSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    containerNo: String,
    containerType: String,
    containerStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    leaseOwnType: {
      type: String,
      enum: ['lease', 'own'],
      default: 'lease',
    },
    purchaseDate: Date,
    onHireDate: Date,
    onHireLocation: String,
    OffHireDate: Date,
    offHireLocation: String,
    leaseAmount: Number,
    currency: String,
    stickerCompleted: {
      type: String,
      enum: ['', 'yes', 'no'],
      default: '',
    },
    remarks: String,

    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
  },
  { timestamps: true }
);

ContainerInventoryMasterSchema.index({
  organization: 1,
});

module.exports = mongoose.model(
  'ContainerInventoryMaster',
  ContainerInventoryMasterSchema
);
