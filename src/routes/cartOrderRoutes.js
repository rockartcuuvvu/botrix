const express = require('express');
const router = express.Router();
const cartOrderController = require('../controllers/cartOrderController');
const { requireAuth, requireClient, requireAdmin } = require('../middleware/auth');

// Client Custom Catalogue & Orders
router.get('/catalogue', requireAuth, requireClient, cartOrderController.getClientCatalogue);
router.get('/my-orders', requireAuth, requireClient, cartOrderController.getClientOrders);
router.post('/orders', requireAuth, requireClient, cartOrderController.createOrder);

// Admin Orders
router.get('/admin/orders', requireAuth, requireAdmin, cartOrderController.getAllOrders);
router.put('/admin/orders/:orderId/status', requireAuth, requireAdmin, cartOrderController.updateOrderStatus);

module.exports = router;
