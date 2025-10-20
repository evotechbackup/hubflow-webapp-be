const mongoose = require('mongoose');

// Define the schema for calendar events
const DepartmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Modules',
      },
    ],

    mainModule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Modules',
    },

    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Roles',
      },
    ],

    dashboard: {
      type: String,
      default: 'main',
      enum: ['main', 'manpower', 'inventory'],
    },

    // You might want to add other fields as needed
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', DepartmentSchema);
