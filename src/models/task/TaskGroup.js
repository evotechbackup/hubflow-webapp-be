const mongoose = require('mongoose');

const TaskGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    agents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },

    // Tags for task groups
    tags: [
      {
        tag: {
          type: String,
        },
        color: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('TaskGroup', TaskGroupSchema);
