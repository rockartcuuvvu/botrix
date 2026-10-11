const mongoose = require('mongoose');

const customPriceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  customPrice: {
    type: Number,
    required: true,
    min: 0
  },
  quoteRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuoteRequest'
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const clientCatalogueSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [customPriceItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('ClientCatalogue', clientCatalogueSchema);
