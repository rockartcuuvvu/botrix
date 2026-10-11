const QuoteRequest = require('../models/QuoteRequest');
const ClientCatalogue = require('../models/ClientCatalogue');
const Product = require('../models/Product');
const Message = require('../models/Message');

// Client submits a new quote request
const createQuoteRequest = async (req, res) => {
  try {
    const { items, clientNotes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Quote request must include at least one item.' });
    }

    const requestNumber = `QR-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const quoteItems = items.map(item => ({
      product: item.productId || null,
      customItemName: item.customItemName || '',
      quantity: Number(item.quantity) || 1,
      notes: item.notes || ''
    }));

    const quoteRequest = new QuoteRequest({
      client: req.user._id,
      requestNumber,
      items: quoteItems,
      clientNotes: clientNotes || '',
      status: 'Pending'
    });

    await quoteRequest.save();

    // System message notification in chat thread
    await Message.create({
      client: req.user._id,
      sender: req.user._id,
      senderRole: 'client',
      content: `Submitted Quote Request ${requestNumber} with ${quoteItems.length} item(s).`,
      quoteRequest: quoteRequest._id
    });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(201).json({
        message: 'Quote request submitted successfully! Admin will review and issue custom pricing to your catalogue.',
        quoteRequest
      });
    }

    return res.redirect('/portal/quotes');
  } catch (err) {
    console.error('Error creating quote request:', err);
    return res.status(500).json({ error: 'Failed to submit quote request.' });
  }
};

// Client views their submitted quote requests
const getClientQuoteRequests = async (req, res) => {
  try {
    const quotes = await QuoteRequest.find({ client: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ quotes });
    }

    return res.render('clientQuotes', { quotes, user: req.user });
  } catch (err) {
    console.error('Error fetching client quotes:', err);
    return res.status(500).json({ error: 'Failed to fetch quote requests.' });
  }
};

// Admin views all quote requests across clients
const getAllQuoteRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) filter.status = status;

    const quotes = await QuoteRequest.find(filter)
      .populate('client', 'name email company phone')
      .populate('items.product')
      .sort({ createdAt: -1 });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ quotes });
    }

    return res.render('admin/quotes', { quotes, currentStatus: status || 'All', user: req.user });
  } catch (err) {
    console.error('Error fetching all quotes:', err);
    return res.status(500).json({ error: 'Failed to fetch quotes.' });
  }
};

// Admin responds to quote request with custom pricing & loads prices into client's catalogue
const respondToQuote = async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { itemPrices, adminNotes, status } = req.body;
    // itemPrices format: [{ productId: '...', price: 150.00 }]

    const quote = await QuoteRequest.findById(quoteId).populate('client');
    if (!quote) {
      return res.status(404).json({ error: 'Quote request not found.' });
    }

    if (adminNotes !== undefined) quote.adminNotes = adminNotes;
    if (status) quote.status = status;

    // Apply priced items
    if (itemPrices && Array.isArray(itemPrices)) {
      itemPrices.forEach(offered => {
        const item = quote.items.find(i => i.product && i.product.toString() === offered.productId.toString());
        if (item) {
          item.offeredPrice = Number(offered.price);
        }
      });
    }

    await quote.save();

    // If quote is marked as 'Quoted' or 'Accepted', populate prices into ClientCatalogue
    if (quote.status === 'Quoted' || quote.status === 'Accepted') {
      let catalogue = await ClientCatalogue.findOne({ client: quote.client._id });
      if (!catalogue) {
        catalogue = new ClientCatalogue({ client: quote.client._id, items: [] });
      }

      quote.items.forEach(item => {
        if (item.product && item.offeredPrice > 0) {
          const existingIndex = catalogue.items.findIndex(
            ci => ci.product.toString() === item.product.toString()
          );

          if (existingIndex >= 0) {
            catalogue.items[existingIndex].customPrice = item.offeredPrice;
            catalogue.items[existingIndex].quoteRequest = quote._id;
            catalogue.items[existingIndex].addedAt = new Date();
          } else {
            catalogue.items.push({
              product: item.product,
              customPrice: item.offeredPrice,
              quoteRequest: quote._id
            });
          }
        }
      });

      await catalogue.save();

      // Log notification message to client
      await Message.create({
        client: quote.client._id,
        sender: req.user._id,
        senderRole: 'admin',
        content: `Your Quote Request ${quote.requestNumber} has been updated with approved pricing! Custom prices have been loaded to your catalogue.`,
        quoteRequest: quote._id
      });
    }

    return res.json({
      message: 'Quote request updated successfully and prices loaded to catalogue.',
      quote
    });
  } catch (err) {
    console.error('Error responding to quote:', err);
    return res.status(500).json({ error: 'Failed to respond to quote request.' });
  }
};

module.exports = {
  createQuoteRequest,
  getClientQuoteRequests,
  getAllQuoteRequests,
  respondToQuote
};
