const mongoose = require('mongoose');

const quoteItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  customItemName: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  notes: String,
  offeredPrice: {
    type: Number,
    default: 0
  }
});

const quoteRequestSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [quoteItemSchema],
  clientNotes: String,
  status: {
    type: String,
    enum: ['Pending', 'Quoted', 'Accepted', 'Rejected'],
    default: 'Pending'
  },
  adminNotes: String,
  validUntil: Date
}, { timestamps: true });

module.exports = mongoose.model('QuoteRequest', quoteRequestSchema);
