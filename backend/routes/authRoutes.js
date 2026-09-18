const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    const normalizedUsername = username?.trim().toLowerCase();

    if (!normalizedUsername) {
      return res.status(400).json({
        error: 'Username is required',
      });
    }

    if (!/^[a-z0-9_]{3,20}$/.test(normalizedUsername)) {
      return res.status(400).json({
        error:
          'Username must be 3-20 characters and contain only letters, numbers, or underscores',
      });
    }

    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(400).json({
        error: 'Email already registered',
      });
    }

    const existingUsername = await User.findOne({
      username: normalizedUsername,
    });

    if (existingUsername) {
      return res.status(400).json({
        error: 'Username is already taken',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      username: normalizedUsername,
      email,
      password: hashedPassword,
      role,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.username) {
      return res.status(400).json({
        error: 'Username is already taken',
      });
    }

    res.status(500).json({
      error: err.message,
    });
  }
});

// CHECK USERNAME AVAILABILITY
router.get('/check-username', async (req, res) => {
  try {
    const username = req.query.username?.trim().toLowerCase();

    if (!username) {
      return res.json({
        available: false,
        message: 'Username is required',
      });
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return res.json({
        available: false,
        message:
          'Use 3-20 characters: letters, numbers, or underscores',
      });
    }

    const existingUser = await User.findOne({ username });

    res.json({
      available: !existingUser,
      message: existingUser
        ? 'Username is already taken'
        : 'Username is available',
    });
  } catch (err) {
    res.status(500).json({
      available: false,
      message: 'Unable to check username',
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
  token,
  user: {
    id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
  },
});

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;