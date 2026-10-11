const ClientCatalogue = require('../models/ClientCatalogue');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Message = require('../models/Message');

const getClientCatalogue = async (req, res) => {
  try {
    const catalogue = await ClientCatalogue.findOne({ client: req.user._id })
      .populate('items.product');

    const catalogueItems = catalogue ? catalogue.items.filter(item => item.product && item.product.isActive) : [];

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ catalogueItems });
    }

    return res.render('clientCatalogue', { catalogueItems, user: req.user });
  } catch (err) {
    console.error('Error fetching client catalogue:', err);
    return res.status(500).json({ error: 'Failed to fetch custom catalogue.' });
  }
};

const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress, notes } = req.body;
    // items format: [{ productId: '...', quantity: 2 }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart/order must contain at least one item.' });
    }

    // Fetch client custom catalogue
    const catalogue = await ClientCatalogue.findOne({ client: req.user._id });
    if (!catalogue || !catalogue.items || catalogue.items.length === 0) {
      return res.status(400).json({ error: 'No custom pricing found in your catalogue. Please request a quote first.' });
    }

    const priceMap = new Map();
    catalogue.items.forEach(ci => {
      priceMap.set(ci.product.toString(), ci.customPrice);
    });

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const prodId = item.productId;
      if (!priceMap.has(prodId)) {
        return res.status(400).json({
          error: `Product ${prodId} does not have an approved quote price in your catalogue.`
        });
      }

      const product = await Product.findById(prodId);
      if (!product || !product.isActive) {
        return res.status(404).json({ error: `Product ${prodId} is unavailable.` });
      }

      const unitPrice = priceMap.get(prodId);
      const qty = Math.max(1, Number(item.quantity) || 1);
      const subtotal = unitPrice * qty;

      totalAmount += subtotal;
      orderItems.push({
        product: product._id,
        title: product.title,
        unitPrice,
        quantity: qty,
        subtotal
      });
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const order = new Order({
      client: req.user._id,
      orderNumber,
      items: orderItems,
      totalAmount,
      status: 'Pending',
      shippingAddress: shippingAddress || req.user.address || {},
      notes: notes || ''
    });

    await order.save();

    // Create system message for order
    await Message.create({
      client: req.user._id,
      sender: req.user._id,
      senderRole: 'client',
      content: `Placed new Order ${orderNumber} for $${totalAmount.toFixed(2)}.`,
      order: order._id
    });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(201).json({
        message: 'Order placed successfully!',
        order
      });
    }

    return res.redirect('/portal/orders');
  } catch (err) {
    console.error('Error placing order:', err);
    return res.status(500).json({ error: 'Failed to place order.' });
  }
};

const getClientOrders = async (req, res) => {
  try {
    const orders = await Order.find({ client: req.user._id }).sort({ createdAt: -1 });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ orders });
    }

    return res.render('clientOrders', { orders, user: req.user });
  } catch (err) {
    console.error('Error fetching client orders:', err);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('client', 'name email company phone')
      .sort({ createdAt: -1 });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ orders });
    }

    return res.render('admin/orders', { orders, currentStatus: status || 'All', user: req.user });
  } catch (err) {
    console.error('Error fetching admin orders:', err);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    order.status = status;
    await order.save();

    // Message notification
    await Message.create({
      client: order.client,
      sender: req.user._id,
      senderRole: 'admin',
      content: `Status update for Order ${order.orderNumber}: Marked as ${status}.`,
      order: order._id
    });

    return res.json({ message: 'Order status updated successfully.', order });
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
};

module.exports = {
  getClientCatalogue,
  createOrder,
  getClientOrders,
  getAllOrders,
  updateOrderStatus
};
