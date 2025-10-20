const mongoose = require('mongoose');

const FcmTableSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  tokens: [
    {
      type: String,
    },
  ],
});

module.exports = mongoose.model('FCM', FcmTableSchema);
