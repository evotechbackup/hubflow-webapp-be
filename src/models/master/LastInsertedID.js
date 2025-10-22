const mongoose = require('mongoose');
const LastInsertedIdSchema = new mongoose.Schema(
  {
    entity: {
      type: String,
      required: true,
    },
    lastId: {
      type: Number,
      default: 0,
    },
    prefix: {
      type: String,
      default: '', // Default prefix, adjust as needed
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model('LastInsertedId', LastInsertedIdSchema);
