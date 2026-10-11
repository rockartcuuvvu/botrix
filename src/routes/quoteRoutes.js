const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const { requireAuth, requireClient, requireAdmin } = require('../middleware/auth');

router.post('/', requireAuth, requireClient, quoteController.createQuoteRequest);
router.get('/my-quotes', requireAuth, requireClient, quoteController.getClientQuoteRequests);

// Admin quote routes
router.get('/all', requireAuth, requireAdmin, quoteController.getAllQuoteRequests);
router.put('/:quoteId/respond', requireAuth, requireAdmin, quoteController.respondToQuote);

module.exports = router;
