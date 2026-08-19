const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function mapLesson(row) {
  return {
    id: row.id,
    title: row.title,
    icon: row.icon,
    sortOrder: row.sort_order,
    wordCount: Number(row.word_count ?? 0),
    linkCount: Number(row.link_count ?? 0),
    updatedAt: row.updated_at,
  };
}

async function fetchFullLesson(conn, lessonId, appId) {
  const [lessons] = appId
    ? await conn.query(
        'SELECT id, title, icon, sort_order, updated_at FROM lessons WHERE id = ? AND app_id = ?',
        [lessonId, appId]
      )
    : await conn.query(
        'SELECT id, title, icon, sort_order, updated_at FROM lessons WHERE id = ?',
        [lessonId]
      );
  const lesson = lessons[0];
  if (!lesson) return null;
  const [words] = await conn.query(
    'SELECT id, text, image, phonetic, sort_order FROM lesson_words WHERE lesson_id = ? ORDER BY sort_order ASC',
    [lessonId]
  );
  const [links] = await conn.query(
    'SELECT id, text, url, sort_order FROM lesson_links WHERE lesson_id = ? ORDER BY sort_order ASC',
    [lessonId]
  );
  return {
    id: lesson.id,
    title: lesson.title,
    icon: lesson.icon,
    sortOrder: lesson.sort_order,
    words: words.map((w) => ({ id: w.id, text: w.text, image: w.image, phonetic: w.phonetic })),
    externalLinks: links.map((l) => ({ id: l.id, text: l.text, url: l.url })),
  };
}

async function insertWordsAndLinks(conn, lessonId, words, externalLinks) {
  if (words && words.length > 0) {
    const wordValues = words.map((w, j) => [
      w.id || `${lessonId}-word-${j}`,
      lessonId,
      w.text || '',
      w.image || '',
      w.phonetic || '',
      j,
    ]);
    await conn.query(
      'INSERT INTO lesson_words (id, lesson_id, text, image, phonetic, sort_order) VALUES ?',
      [wordValues]
    );
  }
  if (externalLinks && externalLinks.length > 0) {
    const linkValues = externalLinks.map((l, k) => [lessonId, l.text || '', l.url || '', k]);
    await conn.query(
      'INSERT INTO lesson_links (lesson_id, text, url, sort_order) VALUES ?',
      [linkValues]
    );
  }
}

// GET /api/lessons — list all lessons for the current user's app
router.get('/', requireAuth, async (req, res) => {
  const appId = req.user.appId;
  if (!appId) return res.status(403).json({ error: 'No app context in token' });
  try {
    const [rows] = await pool.execute(`
      SELECT l.id, l.title, l.icon, l.sort_order, l.updated_at,
             COUNT(DISTINCT lw.id) AS word_count,
             COUNT(DISTINCT ll.id) AS link_count
      FROM lessons l
      LEFT JOIN lesson_words lw ON lw.lesson_id = l.id
      LEFT JOIN lesson_links ll ON ll.lesson_id = l.id
      WHERE l.app_id = ?
      GROUP BY l.id
      ORDER BY l.sort_order ASC
    `, [appId]);
    return res.json({ lessons: rows.map(mapLesson) });
  } catch (err) {
    console.error('List lessons error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/lessons/:id — get one lesson (must belong to same app, or superadmin)
router.get('/:id', requireAuth, async (req, res) => {
  const appId = req.user.appId;
  if (!appId && !req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'No app context in token' });
  }
  const conn = await pool.getConnection();
  try {
    const lesson = await fetchFullLesson(conn, req.params.id, appId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    return res.json({ lesson });
  } catch (err) {
    console.error('Get lesson error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// POST /api/lessons/bulk — bulk import lessons scoped to admin's app
router.post('/bulk', requireAdmin, async (req, res) => {
  const { lessons, overwrite = true } = req.body;
  const appId = req.user.appId;
  if (!appId) return res.status(403).json({ error: 'No app context in token' });
  if (!Array.isArray(lessons) || lessons.length === 0) {
    return res.status(400).json({ error: 'lessons array is required and must not be empty' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let totalWords = 0;
    let totalLinks = 0;
    const errors = [];

    for (let i = 0; i < lessons.length; i++) {
      const item = lessons[i];
      const lessonId = String(item.id || '').trim();
      const title = String(item.title || '').trim();
      const icon = String(item.icon || '').trim();
      const sortOrder = Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : i + 1;
      const words = Array.isArray(item.words) ? item.words : [];
      const externalLinks = Array.isArray(item.externalLinks) ? item.externalLinks : [];

      if (!lessonId || !title) {
        errors.push({ index: i, lessonId, error: 'Both id and title are required' });
        continue;
      }

      const [[existing]] = await conn.query(
        'SELECT id FROM lessons WHERE id = ? AND app_id = ?',
        [lessonId, appId]
      );

      if (existing) {
        if (overwrite) {
          await conn.query(
            'UPDATE lessons SET title = ?, icon = ?, sort_order = ? WHERE id = ? AND app_id = ?',
            [title, icon, sortOrder, lessonId, appId]
          );
          await conn.query('DELETE FROM lesson_words WHERE lesson_id = ?', [lessonId]);
          await conn.query('DELETE FROM lesson_links WHERE lesson_id = ?', [lessonId]);
          await insertWordsAndLinks(conn, lessonId, words, externalLinks);
          updatedCount++;
          totalWords += words.length;
          totalLinks += externalLinks.length;
        } else {
          skippedCount++;
        }
      } else {
        await conn.query(
          'INSERT INTO lessons (id, app_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
          [lessonId, appId, title, icon, sortOrder]
        );
        await insertWordsAndLinks(conn, lessonId, words, externalLinks);
        createdCount++;
        totalWords += words.length;
        totalLinks += externalLinks.length;
      }
    }

    await conn.commit();

    return res.status(200).json({
      success: true,
      summary: {
        total: lessons.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        words: totalWords,
        links: totalLinks,
        errors,
      },
    });
  } catch (err) {
    await conn.rollback();
    console.error('Bulk lessons import error:', err);
    return res.status(500).json({ error: 'Internal server error during bulk import' });
  } finally {
    conn.release();
  }
});

// POST /api/lessons — create lesson scoped to admin's app
router.post('/', requireAdmin, async (req, res) => {
  const { id, title, icon, sortOrder, words, externalLinks } = req.body;
  const appId = req.user.appId;
  if (!appId) return res.status(403).json({ error: 'No app context in token' });
  if (!id || !title) return res.status(400).json({ error: 'id and title are required' });

  const conn = await pool.getConnection();
  try {
    const [[existing]] = await conn.query(
      'SELECT id FROM lessons WHERE id = ? AND app_id = ?',
      [id, appId]
    );
    if (existing) return res.status(409).json({ error: 'A lesson with that ID already exists in this app' });

    await conn.beginTransaction();
    await conn.query(
      'INSERT INTO lessons (id, app_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
      [id, appId, title, icon || '', sortOrder ?? 0]
    );
    await insertWordsAndLinks(conn, id, words, externalLinks);
    await conn.commit();

    const lesson = await fetchFullLesson(conn, id, appId);
    return res.status(201).json({ lesson });
  } catch (err) {
    await conn.rollback();
    console.error('Create lesson error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// PUT /api/lessons/:id — update lesson (must belong to admin's app)
router.put('/:id', requireAdmin, async (req, res) => {
  const { id: paramId } = req.params;
  const { title, icon, sortOrder, words, externalLinks } = req.body;
  const appId = req.user.appId;
  if (!appId) return res.status(403).json({ error: 'No app context in token' });
  if (!title) return res.status(400).json({ error: 'title is required' });

  const conn = await pool.getConnection();
  try {
    const [[existing]] = await conn.query(
      'SELECT id FROM lessons WHERE id = ? AND app_id = ?',
      [paramId, appId]
    );
    if (!existing) return res.status(404).json({ error: 'Lesson not found' });

    await conn.beginTransaction();
    await conn.query(
      'UPDATE lessons SET title = ?, icon = ?, sort_order = ? WHERE id = ? AND app_id = ?',
      [title, icon || '', sortOrder ?? 0, paramId, appId]
    );
    await conn.query('DELETE FROM lesson_words WHERE lesson_id = ?', [paramId]);
    await conn.query('DELETE FROM lesson_links WHERE lesson_id = ?', [paramId]);
    await insertWordsAndLinks(conn, paramId, words, externalLinks);
    await conn.commit();

    const lesson = await fetchFullLesson(conn, paramId, appId);
    return res.json({ lesson });
  } catch (err) {
    await conn.rollback();
    console.error('Update lesson error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    conn.release();
  }
});

// DELETE /api/lessons/:id — delete lesson (must belong to admin's app)
router.delete('/:id', requireAdmin, async (req, res) => {
  const appId = req.user.appId;
  if (!appId) return res.status(403).json({ error: 'No app context in token' });
  try {
    const [result] = await pool.execute(
      'DELETE FROM lessons WHERE id = ? AND app_id = ?',
      [req.params.id, appId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Lesson not found' });
    return res.json({ message: 'Lesson deleted' });
  } catch (err) {
    console.error('Delete lesson error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
