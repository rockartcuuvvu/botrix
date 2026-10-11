const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'b2b_ecomm_secure_secret_key_2025';

// Helper to attach user to req from session or token cookie/header
const attachUser = async (req, res, next) => {
  res.locals.user = null;
  req.user = null;

  try {
    // Check session first
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId).select('-password');
      if (user) {
        req.user = user;
        res.locals.user = user;
        return next();
      }
    }

    // Check JWT in auth header or cookies
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        res.locals.user = user;
      }
    }
  } catch (err) {
    // Ignore invalid tokens for public routes
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    return res.redirect('/login');
  }
  next();
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    return res.status(403).render('error/403', { message: 'Admin access required', user: req.user });
  }
  next();
};

const requireClient = (req, res, next) => {
  if (!req.user || req.user.role !== 'client') {
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(403).json({ error: 'Client access required' });
    }
    return res.status(403).render('error/403', { message: 'Client access required', user: req.user });
  }
  next();
};

module.exports = {
  attachUser,
  requireAuth,
  requireAdmin,
  requireClient,
  JWT_SECRET
};
