const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const register = async (req, res) => {
  try {
    const { name, email, password, company, phone, street, city, state, zip, country } = req.body;

    if (!name || !email || !password || !company) {
      return res.status(400).json({ error: 'Name, email, password, and company are required.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
      company,
      phone: phone || '',
      role: 'client',
      address: { street, city, state, zip, country }
    });

    await user.save();

    // Set Session
    if (req.session) {
      req.session.userId = user._id;
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(201).json({
        message: 'Account created successfully!',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          company: user.company,
          role: user.role
        }
      });
    }

    return res.redirect('/portal');
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Set session
    if (req.session) {
      req.session.userId = user._id;
    }

    // Set cookie
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({
        message: 'Login successful!',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          company: user.company,
          role: user.role
        }
      });
    }

    if (user.role === 'admin') {
      return res.redirect('/admin');
    }
    return res.redirect('/portal');
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
};

const logout = (req, res) => {
  if (req.session) {
    req.session.destroy();
  }
  res.clearCookie('token');

  if (req.xhr || req.headers.accept?.includes('json')) {
    return res.json({ message: 'Logged out successfully.' });
  }

  return res.redirect('/login');
};

const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false, user: null });
  }
  return res.json({
    authenticated: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      company: req.user.company,
      role: req.user.role
    }
  });
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser
};
