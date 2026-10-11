const Message = require('../models/Message');
const User = require('../models/User');

// Get chat messages for current client thread
const getClientMessages = async (req, res) => {
  try {
    const clientId = req.user.role === 'admin' ? req.query.clientId : req.user._id;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required.' });
    }

    const messages = await Message.find({ client: clientId })
      .populate('sender', 'name role company')
      .sort({ createdAt: 1 });

    // Mark unread messages as read
    if (req.user.role === 'client') {
      await Message.updateMany(
        { client: clientId, senderRole: 'admin', isRead: false },
        { isRead: true }
      );
    } else if (req.user.role === 'admin') {
      await Message.updateMany(
        { client: clientId, senderRole: 'client', isRead: false },
        { isRead: true }
      );
    }

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ messages });
    }

    return res.render('clientChat', { messages, clientId, user: req.user });
  } catch (err) {
    console.error('Error fetching messages:', err);
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

// Send a chat message
const sendMessage = async (req, res) => {
  try {
    const { content, clientId, quoteRequestId, orderId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    let targetClientId = req.user._id;
    if (req.user.role === 'admin') {
      if (!clientId) {
        return res.status(400).json({ error: 'Target clientId is required for admin messages.' });
      }
      targetClientId = clientId;
    }

    const message = new Message({
      client: targetClientId,
      sender: req.user._id,
      senderRole: req.user.role,
      content: content.trim(),
      quoteRequest: quoteRequestId || null,
      order: orderId || null
    });

    await message.save();
    await message.populate('sender', 'name role company');

    // Emit live socket event if io is attached to app
    const io = req.app.get('io');
    if (io) {
      io.to(`client_${targetClientId}`).emit('chatMessage', message);
      io.to('admin_room').emit('chatMessage', message);
    }

    return res.status(201).json({ message });
  } catch (err) {
    console.error('Error sending message:', err);
    return res.status(500).json({ error: 'Failed to send message.' });
  }
};

// Admin list of active client chat threads
const getAdminChatThreads = async (req, res) => {
  try {
    // Find all distinct clients who have sent/received messages
    const clientIds = await Message.distinct('client');
    const clients = await User.find({ _id: { $in: clientIds } }).select('name email company phone role');

    // Attach unread counts
    const threads = await Promise.all(
      clients.map(async client => {
        const lastMsg = await Message.findOne({ client: client._id }).sort({ createdAt: -1 });
        const unreadCount = await Message.countDocuments({ client: client._id, senderRole: 'client', isRead: false });
        return {
          client,
          lastMessage: lastMsg,
          unreadCount
        };
      })
    );

    threads.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ threads });
    }

    return res.render('admin/chatThreads', { threads, user: req.user });
  } catch (err) {
    console.error('Error fetching chat threads:', err);
    return res.status(500).json({ error: 'Failed to fetch chat threads.' });
  }
};

module.exports = {
  getClientMessages,
  sendMessage,
  getAdminChatThreads
};
