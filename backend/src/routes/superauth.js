const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// POST /api/superauth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, password_hash FROM superadmins WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const superadmin = rows[0];
    const passwordMatch = await bcrypt.compare(password, superadmin.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: superadmin.id, email: superadmin.email, isSuperAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      token,
      user: {
        id: superadmin.id,
        username: superadmin.username,
        email: superadmin.email,
        isSuperAdmin: true
      },
    });
  } catch (err) {
    console.error('Superadmin login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
