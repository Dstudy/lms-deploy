const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/speech-usage — record one speech-recognition attempt
router.post('/', requireAuth, async (req, res) => {
  const { wordId, durationMs, hasResult, errorCode } = req.body;
  const duration = Math.max(0, Math.min(Math.round(Number(durationMs) || 0), 120000));

  try {
    await pool.execute(
      `INSERT INTO speech_usage (user_id, app_id, word_id, duration_ms, has_result, error_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.user.appId ?? null,
        wordId ? String(wordId).slice(0, 128) : null,
        duration,
        hasResult ? 1 : 0,
        errorCode ? String(errorCode).slice(0, 64) : null,
      ]
    );
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Record speech usage error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/speech-usage/summary — monthly audio hours for this admin's app
router.get('/summary', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
              COUNT(*)                         AS requests,
              COUNT(DISTINCT user_id)          AS users,
              SUM(duration_ms) / 3600000       AS audioHours
       FROM speech_usage
       WHERE app_id = ?
       GROUP BY month
       ORDER BY month DESC`,
      [req.user.appId]
    );
    return res.json({ months: rows });
  } catch (err) {
    console.error('Speech usage summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
