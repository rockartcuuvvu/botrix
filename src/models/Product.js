const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Stationery', 'Online Development Packages', 'Computers', 'Custom Requests']
  },
  description: {
    type: String,
    required: true
  },
  listPrice: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    default: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop'
  },
  specifications: [{
    key: String,
    value: String
  }],
  inStock: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
