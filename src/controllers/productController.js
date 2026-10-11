const Product = require('../models/Product');
const { applyPriceGatingToProducts } = require('../middleware/priceGating');

const getAllProducts = async (req, res) => {
  try {
    const { category, search } = req.query;
    let filter = { isActive: true };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    const gatedProducts = await applyPriceGatingToProducts(products, req.user);

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ products: gatedProducts });
    }

    return res.render('catalog', {
      products: gatedProducts,
      selectedCategory: category || 'All',
      search: search || '',
      user: req.user
    });
  } catch (err) {
    console.error('Error getting products:', err);
    return res.status(500).json({ error: 'Failed to retrieve products.' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const gatedProduct = await applyPriceGatingToProducts(product, req.user);

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ product: gatedProduct });
    }

    return res.render('productDetail', { product: gatedProduct, user: req.user });
  } catch (err) {
    console.error('Error fetching product:', err);
    return res.status(500).json({ error: 'Failed to fetch product.' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { title, sku, category, description, listPrice, image, specifications } = req.body;

    if (!title || !category || !description || listPrice === undefined) {
      return res.status(400).json({ error: 'Title, category, description, and listPrice are required.' });
    }

    const product = new Product({
      title,
      sku: sku || `SKU-${Date.now()}`,
      category,
      description,
      listPrice: Number(listPrice),
      image: image || 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop',
      specifications: specifications || []
    });

    await product.save();
    return res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    console.error('Error creating product:', err);
    return res.status(500).json({ error: 'Failed to create product.' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { title, sku, category, description, listPrice, image, specifications, inStock } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (title) product.title = title;
    if (sku) product.sku = sku;
    if (category) product.category = category;
    if (description) product.description = description;
    if (listPrice !== undefined) product.listPrice = Number(listPrice);
    if (image) product.image = image;
    if (specifications) product.specifications = specifications;
    if (inStock !== undefined) product.inStock = inStock;

    await product.save();
    return res.json({ message: 'Product updated successfully', product });
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ error: 'Failed to update product.' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    product.isActive = false;
    await product.save();

    return res.json({ message: 'Product removed from catalog.' });
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
