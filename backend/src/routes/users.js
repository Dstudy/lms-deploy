const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users — list all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, role FROM user_profiles WHERE app_id = ? ORDER BY created_at DESC',
      [req.user.appId]
    );
    return res.json({ userProfiles: rows });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id — get single user profile
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, role, app_id FROM user_profiles WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.json({ userProfile: null });
    }
    const profile = rows[0];

    // Users can only fetch their own profile; admins can fetch any within their app
    if (req.user.id !== id) {
      if (req.user.role !== 'admin' || req.user.appId !== profile.app_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    return res.json({ userProfile: profile });
  } catch (err) {
    console.error('Get user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users — create a user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { email, username, password, role } = req.body;
  const appId = req.user.appId;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'email, username, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Check for duplicate email in this app
    const [existing] = await pool.execute(
      'SELECT id FROM user_profiles WHERE email = ? AND app_id = ?',
      [email, appId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists in this app' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'student';

    await pool.execute(
      'INSERT INTO user_profiles (id, username, email, role, app_id, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, email, userRole, appId, passwordHash]
    );

    return res.status(201).json({
      userProfile: { id, username, email, role: userRole, appId },
    });
  } catch (err) {
    console.error('Create user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id — update username and/or role (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { username, role } = req.body;
  const appId = req.user.appId;

  if (!username && !role) {
    return res.status(400).json({ error: 'At least one of username or role is required' });
  }

  try {
    const [existing] = await pool.execute(
      'SELECT id, username, email, role, app_id FROM user_profiles WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const current = existing[0];
    if (current.app_id !== appId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const newUsername = username ?? current.username;
    const newRole = role ?? current.role;

    await pool.execute(
      'UPDATE user_profiles SET username = ?, role = ? WHERE id = ?',
      [newUsername, newRole, id]
    );

    return res.json({
      userProfile: { id, username: newUsername, email: current.email, role: newRole, appId },
    });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id — delete user (admin only, cascades progress)
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const appId = req.user.appId;

  try {
    const [existing] = await pool.execute(
      'SELECT app_id FROM user_profiles WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (existing[0].app_id !== appId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await pool.execute(
      'DELETE FROM user_profiles WHERE id = ?',
      [id]
    );
    return res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
