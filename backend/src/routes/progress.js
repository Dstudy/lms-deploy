const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function mapRow(row) {
  return {
    userId:       row.user_id,
    lessonId:     row.lesson_id,
    learnIndex:   row.learn_index,
    p2Stars:      row.p2_stars,
    p3Score:      row.p3_score,
    p4LinksCount: row.p4_links_count,
    updatedAt:    row.updated_at,
  };
}

// GET /api/progress/all — all users' progress for given lessons (admin only)
// Must be registered BEFORE /:lessonId so "all" isn't captured as a param
router.get('/all', requireAdmin, async (req, res) => {
  const { lessonIds } = req.query;

  if (!lessonIds) {
    return res.status(400).json({ error: 'lessonIds query param is required' });
  }

  const ids = lessonIds.split(',').filter(Boolean);
  if (ids.length === 0) {
    return res.json({ userProgresses: [] });
  }

  try {
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT up.* FROM user_progress up
       INNER JOIN user_profiles u ON up.user_id = u.id
       WHERE u.app_id = ? AND up.lesson_id IN (${placeholders})`,
      [req.user.appId, ...ids]
    );
    return res.json({ userProgresses: rows.map(mapRow) });
  } catch (err) {
    console.error('Fetch all progress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/progress — batch fetch current user's progress for multiple lessons
router.get('/', requireAuth, async (req, res) => {
  const { lessonIds } = req.query;
  const userId = req.user.id;

  if (!lessonIds) {
    return res.status(400).json({ error: 'lessonIds query param is required' });
  }

  const ids = lessonIds.split(',').filter(Boolean);
  if (ids.length === 0) {
    return res.json({ userProgresses: [] });
  }

  try {
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT * FROM user_progress WHERE user_id = ? AND lesson_id IN (${placeholders})`,
      [userId, ...ids]
    );
    return res.json({ userProgresses: rows.map(mapRow) });
  } catch (err) {
    console.error('Batch progress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/progress/:lessonId — get current user's progress for one lesson
router.get('/:lessonId', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { lessonId } = req.params;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?',
      [userId, lessonId]
    );
    return res.json({ userProgress: rows.length > 0 ? mapRow(rows[0]) : null });
  } catch (err) {
    console.error('Get progress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/progress — upsert current user's progress for a lesson
router.post('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { lessonId, learnIndex, p2Stars, p3Score, p4LinksCount } = req.body;

  if (!lessonId) {
    return res.status(400).json({ error: 'lessonId is required' });
  }

  try {
    await pool.execute(
      `INSERT INTO user_progress (user_id, lesson_id, learn_index, p2_stars, p3_score, p4_links_count)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         learn_index    = VALUES(learn_index),
         p2_stars       = VALUES(p2_stars),
         p3_score       = VALUES(p3_score),
         p4_links_count = VALUES(p4_links_count),
         updated_at     = CURRENT_TIMESTAMP`,
      [
        userId,
        lessonId,
        learnIndex ?? 0,
        p2Stars ?? '{}',
        p3Score ?? null,
        p4LinksCount ?? 0,
      ]
    );

    return res.json({
      userProgress: {
        userId,
        lessonId,
        learnIndex: learnIndex ?? 0,
        p2Stars: p2Stars ?? '{}',
        p3Score: p3Score ?? null,
        p4LinksCount: p4LinksCount ?? 0,
      },
    });
  } catch (err) {
    console.error('Save progress error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
