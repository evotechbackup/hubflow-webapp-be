const mongoose = require('mongoose');

const PermissionsSchema = new mongoose.Schema({
  features: {
    type: String,
  },
  create: {
    type: Boolean,
    default: false,
  },
  read: {
    type: Boolean,
    default: false,
  },
  delete: {
    type: Boolean,
    default: false,
  },
  update: {
    type: Boolean,
    default: false,
  },
  enable: {
    type: Boolean,
    default: false,
  },
  assign: {
    type: Boolean,
    default: false,
  },
  admin: {
    type: Boolean,
    default: false,
  },
});

const ApprovalSchema = new mongoose.Schema({
  feature: {
    type: String,
  },
  allowed: {
    type: String,
    enum: [
      '',
      'reviewed',
      'verified',
      'acknowledged',
      'approved1',
      'approved2',
    ],
  },
  notification: {
    // For sending final notification
    type: Boolean,
    default: false,
  },
});

const RolesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    hierarchy: {
      type: Number,
      default: 4,
    },

    permissions: [PermissionsSchema],

    approval: [ApprovalSchema],

    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Modules',
      },
    ],

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model('Roles', RolesSchema);
