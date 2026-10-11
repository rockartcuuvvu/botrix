const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const { attachUser, requireAuth, requireClient, requireAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const cartOrderRoutes = require('./routes/cartOrderRoutes');
const messageRoutes = require('./routes/messageRoutes');

const productController = require('./controllers/productController');
const quoteController = require('./controllers/quoteController');
const cartOrderController = require('./controllers/cartOrderController');
const messageController = require('./controllers/messageController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io);

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'b2b_super_secret_session_key_2025',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
  })
);

app.use(attachUser);

// Views Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io Real-time In-App Chat Setup
io.on('connection', (socket) => {
  socket.on('joinClientRoom', (clientId) => {
    socket.join(`client_${clientId}`);
  });

  socket.on('joinAdminRoom', () => {
    socket.join('admin_room');
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/cart-orders', cartOrderRoutes);
app.use('/api/messages', messageRoutes);

// View Page Routes
app.get('/', productController.getAllProducts);
app.get('/catalog', productController.getAllProducts);
app.get('/products/:id', productController.getProductById);

app.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect(req.user.role === 'admin' ? '/admin' : '/portal');
  }
  res.render('login', { user: null, error: null });
});

app.get('/register', (req, res) => {
  if (req.user) {
    return res.redirect(req.user.role === 'admin' ? '/admin' : '/portal');
  }
  res.render('register', { user: null, error: null });
});

// Client Portal Pages
app.get('/portal', requireAuth, requireClient, (req, res) => {
  res.render('portal/dashboard', { user: req.user });
});

app.get('/portal/catalogue', requireAuth, requireClient, cartOrderController.getClientCatalogue);
app.get('/portal/quotes', requireAuth, requireClient, quoteController.getClientQuoteRequests);
app.get('/portal/orders', requireAuth, requireClient, cartOrderController.getClientOrders);
app.get('/portal/messages', requireAuth, requireClient, messageController.getClientMessages);

// Admin Pages
app.get('/admin', requireAuth, requireAdmin, (req, res) => {
  res.render('admin/dashboard', { user: req.user });
});
app.get('/admin/quotes', requireAuth, requireAdmin, quoteController.getAllQuoteRequests);
app.get('/admin/orders', requireAuth, requireAdmin, cartOrderController.getAllOrders);
app.get('/admin/messages', requireAuth, requireAdmin, messageController.getAdminChatThreads);

// 404 Handler
app.use((req, res) => {
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.status(404).render('error/404', { user: req.user || null });
});

// 500 Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(500).render('error/500', { error: err, user: req.user || null });
});

// Database Connection and Server Startup
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/b2b_store';

if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log('Connected to MongoDB');
      server.listen(PORT, () => {
        console.log(`B2B Store Server running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      // Start server even if DB connection pending (allows handling)
      server.listen(PORT, () => {
        console.log(`B2B Store Server running on port ${PORT} (DB offline)`);
      });
    });
}

module.exports = { app, server };
