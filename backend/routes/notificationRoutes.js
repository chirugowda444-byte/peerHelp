const express = require('express');
const router = express.Router();

const Notification = require('../models/Notification');
const authMiddleware = require('../middleware/authMiddleware');

// GET current user's active notifications
router.get('/', authMiddleware, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.id,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

// MARK current user's notifications as read
router.patch('/read', authMiddleware, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user.id,
        read: false,
        expiresAt: { $gt: new Date() },
      },
      {
        $set: { read: true },
      }
    );

    res.json({
      message: 'Notifications marked as read',
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;