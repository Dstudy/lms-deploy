const express = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const pool = require('../db');
const { requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads/logos/ directory exists
const uploadDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const appId = req.params.id;
    const ext = (path.extname(file.originalname) || '.png').toLowerCase();
    // Use timestamp in filename to bust browser image cache on re-upload
    cb(null, `${appId}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit: 5MB
  fileFilter: (req, file, cb) => {
    const allowedExts = /\.(png|jpe?g|gif|webp)$/i;
    const allowedMimes = /^image\/(png|jpe?g|gif|webp|x-png)$/i;
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();

    if (allowedExts.test(ext) || allowedMimes.test(mime)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file format. Supported formats: PNG, JPG, JPEG, WEBP, and GIF.'));
    }
  }
});

// GET /api/apps — list all apps with user counts (superadmin only)
router.get('/', requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT a.id, a.slug, a.name, a.logo_path, a.created_at, COUNT(u.id) as user_count
      FROM apps a
      LEFT JOIN user_profiles u ON a.id = u.app_id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    return res.json({ apps: rows });
  } catch (err) {
    console.error('List apps error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apps/by-slug/:slug — get app config (public)
router.get('/by-slug/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const [rows] = await pool.execute(
      'SELECT id, slug, name, logo_path FROM apps WHERE slug = ?',
      [slug]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    return res.json({ app: rows[0] });
  } catch (err) {
    console.error('Get app by slug error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/apps — create app (superadmin only)
router.post('/', requireSuperAdmin, async (req, res) => {
  const { name, slug } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'name and slug are required' });
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and dashes' });
  }

  try {
    // Check duplicate slug
    const [existing] = await pool.execute(
      'SELECT id FROM apps WHERE slug = ?',
      [slug]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An app with that slug already exists' });
    }

    const id = uuidv4();
    await pool.execute(
      'INSERT INTO apps (id, slug, name) VALUES (?, ?, ?)',
      [id, slug, name]
    );

    return res.status(201).json({
      app: { id, slug, name, logo_path: '' }
    });
  } catch (err) {
    console.error('Create app error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/apps/:id — update app details (superadmin only)
router.put('/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, slug } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: 'name and slug are required' });
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(slug)) {
    return res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and dashes' });
  }

  try {
    const [appRows] = await pool.execute('SELECT id FROM apps WHERE id = ?', [id]);
    if (appRows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Check duplicate slug with other apps
    const [existing] = await pool.execute(
      'SELECT id FROM apps WHERE slug = ? AND id != ?',
      [slug, id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An app with that slug already exists' });
    }

    await pool.execute(
      'UPDATE apps SET name = ?, slug = ? WHERE id = ?',
      [name, slug, id]
    );

    return res.json({
      app: { id, slug, name }
    });
  } catch (err) {
    console.error('Update app error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/apps/:id/logo — upload logo (superadmin only)
router.post('/:id/logo', requireSuperAdmin, (req, res) => {
  upload.single('logo')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Logo file size exceeds the 5MB limit. Please upload a smaller image.' });
      }
      return res.status(400).json({ error: err.message || 'Failed to process logo file.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No logo file provided. Please choose a PNG, JPG, or WEBP image.' });
    }

    const { id } = req.params;
    const logoPath = `uploads/logos/${req.file.filename}`;

    try {
      const [appRows] = await pool.execute('SELECT id, logo_path FROM apps WHERE id = ?', [id]);
      if (appRows.length === 0) {
        // delete uploaded file if app doesn't exist
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ error: 'Application scope not found' });
      }

      const oldLogoPath = appRows[0]?.logo_path;
      if (oldLogoPath && oldLogoPath.startsWith('uploads/logos/')) {
        const oldFullPath = path.join(__dirname, '../../', oldLogoPath);
        if (fs.existsSync(oldFullPath) && oldFullPath !== req.file.path) {
          try { fs.unlinkSync(oldFullPath); } catch {}
        }
      }

      await pool.execute(
        'UPDATE apps SET logo_path = ? WHERE id = ?',
        [logoPath, id]
      );

      return res.json({
        message: 'Logo uploaded successfully',
        logo_path: logoPath
      });
    } catch (dbErr) {
      console.error('DB update logo error:', dbErr);
      return res.status(500).json({ error: 'Internal database error while saving logo path' });
    }
  });
});

// DELETE /api/apps/:id/lessons — delete ALL lessons for an app (superadmin only)
router.delete('/:id/lessons', requireSuperAdmin, async (req, res) => {
  const { id: appId } = req.params;

  try {
    const [appRows] = await pool.execute('SELECT id FROM apps WHERE id = ?', [appId]);
    if (appRows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Fetch all lesson IDs for this app first
    const [lessonRows] = await pool.execute(
      'SELECT id FROM lessons WHERE app_id = ?',
      [appId]
    );
    const lessonIds = lessonRows.map((r) => r.id);

    if (lessonIds.length === 0) {
      return res.json({ message: 'No lessons to delete', deleted: 0 });
    }

    // Delete words and links first, then lessons
    const placeholders = lessonIds.map(() => '?').join(', ');
    await pool.execute(`DELETE FROM lesson_words WHERE lesson_id IN (${placeholders})`, lessonIds);
    await pool.execute(`DELETE FROM lesson_links WHERE lesson_id IN (${placeholders})`, lessonIds);
    const [result] = await pool.execute(`DELETE FROM lessons WHERE app_id = ?`, [appId]);

    return res.json({ message: 'All lessons deleted', deleted: result.affectedRows });
  } catch (err) {
    console.error('Delete all lessons error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/apps/:id — delete app (superadmin only)
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;

  if (id === 'default') {
    return res.status(400).json({ error: 'Cannot delete the default app' });
  }

  try {
    const [result] = await pool.execute('DELETE FROM apps WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    return res.json({ message: 'App deleted successfully' });
  } catch (err) {
    console.error('Delete app error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/apps/:id/admins — list all admins for this app (superadmin only)
router.get('/:id/admins', requireSuperAdmin, async (req, res) => {
  const { id: appId } = req.params;
  try {
    const [appRows] = await pool.execute('SELECT id FROM apps WHERE id = ?', [appId]);
    if (appRows.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }
    const [rows] = await pool.execute(
      'SELECT id, username, email, role, created_at FROM user_profiles WHERE app_id = ? AND role = ? ORDER BY created_at ASC',
      [appId, 'admin']
    );
    return res.json({ admins: rows });
  } catch (err) {
    console.error('List app admins error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/apps/:id/admins — add an admin for this app (superadmin only)
router.post('/:id/admins', requireSuperAdmin, async (req, res) => {
  const { id: appId } = req.params;
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'email, username, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Verify app exists
    const [apps] = await pool.execute('SELECT id FROM apps WHERE id = ?', [appId]);
    if (apps.length === 0) {
      return res.status(404).json({ error: 'App not found' });
    }

    // Check duplicate email for this app
    const [existing] = await pool.execute(
      'SELECT id FROM user_profiles WHERE email = ? AND app_id = ?',
      [email, appId]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists in this app' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.execute(
      'INSERT INTO user_profiles (id, username, email, role, app_id, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [id, username, email, 'admin', appId, passwordHash]
    );

    return res.status(201).json({
      admin: { id, username, email, role: 'admin', appId }
    });
  } catch (err) {
    console.error('Create app admin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/apps/:id/admins/:adminId — update an admin for this app (superadmin only)
router.put('/:id/admins/:adminId', requireSuperAdmin, async (req, res) => {
  const { id: appId, adminId } = req.params;
  const { username, email, password } = req.body;

  if (!username && !email && !password) {
    return res.status(400).json({ error: 'At least one of username, email, or password is required' });
  }
  if (password && password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    // Verify admin belongs to this app
    const [existing] = await pool.execute(
      'SELECT id, username, email FROM user_profiles WHERE id = ? AND app_id = ? AND role = ?',
      [adminId, appId, 'admin']
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Admin not found in this app' });
    }

    const current = existing[0];
    const newUsername = username ?? current.username;
    const newEmail = email ?? current.email;

    // Check email conflict if changing email
    if (email && email !== current.email) {
      const [emailConflict] = await pool.execute(
        'SELECT id FROM user_profiles WHERE email = ? AND app_id = ? AND id != ?',
        [email, appId, adminId]
      );
      if (emailConflict.length > 0) {
        return res.status(409).json({ error: 'An account with that email already exists in this app' });
      }
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await pool.execute(
        'UPDATE user_profiles SET username = ?, email = ?, password_hash = ? WHERE id = ?',
        [newUsername, newEmail, passwordHash, adminId]
      );
    } else {
      await pool.execute(
        'UPDATE user_profiles SET username = ?, email = ? WHERE id = ?',
        [newUsername, newEmail, adminId]
      );
    }

    return res.json({
      admin: { id: adminId, username: newUsername, email: newEmail, role: 'admin', appId }
    });
  } catch (err) {
    console.error('Update app admin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/apps/:id/admins/:adminId — remove an admin from this app (superadmin only)
router.delete('/:id/admins/:adminId', requireSuperAdmin, async (req, res) => {
  const { id: appId, adminId } = req.params;

  try {
    const [existing] = await pool.execute(
      'SELECT id FROM user_profiles WHERE id = ? AND app_id = ? AND role = ?',
      [adminId, appId, 'admin']
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Admin not found in this app' });
    }

    await pool.execute('DELETE FROM user_profiles WHERE id = ?', [adminId]);
    return res.json({ message: 'Admin removed successfully' });
  } catch (err) {
    console.error('Delete app admin error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
