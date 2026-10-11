const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/thread', requireAuth, messageController.getClientMessages);
router.post('/send', requireAuth, messageController.sendMessage);

// Admin thread listing
router.get('/admin/threads', requireAuth, requireAdmin, messageController.getAdminChatThreads);

module.exports = router;
