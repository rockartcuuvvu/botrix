const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderRole: {
    type: String,
    enum: ['client', 'admin'],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  quoteRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuoteRequest'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
