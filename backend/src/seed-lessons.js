require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

// Usage: node seed-lessons.js <app_id>
const appId = process.argv[2];
if (!appId) {
  console.error('Usage: node seed-lessons.js <app_id>');
  process.exit(1);
}

// Load LESSONS data from local JSON or parse from frontend TypeScript file
let LESSONS = [];
const localJsonPath = path.join(__dirname, 'lessons-data.json');
const tsFilePath = path.join(__dirname, '../../frontend/src/lib/lessons-data.ts');

if (fs.existsSync(localJsonPath)) {
  LESSONS = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));
} else if (fs.existsSync(tsFilePath)) {
  const tsContent = fs.readFileSync(tsFilePath, 'utf8');
  const arrayStart = tsContent.indexOf('export const LESSONS');
  const equalsSign = tsContent.indexOf('=', arrayStart);
  const bracketStart = tsContent.indexOf('[', equalsSign);
  const bracketEnd = tsContent.lastIndexOf(']');
  LESSONS = JSON.parse(tsContent.slice(bracketStart, bracketEnd + 1));
} else {
  console.error('Error: Could not find lessons-data.json or lessons-data.ts to seed from.');
  process.exit(1);
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    // Verify the app exists
    const [apps] = await conn.query('SELECT id FROM apps WHERE id = ?', [appId]);
    if (apps.length === 0) {
      console.error(`App with id "${appId}" not found.`);
      process.exit(1);
    }

    let wordCount = 0;
    let linkCount = 0;
    for (let i = 0; i < LESSONS.length; i++) {
      const l = LESSONS[i];
      // Use a composite id so the same lesson template can exist in multiple apps
      const lessonId = `${appId}__${l.id}`;
      await conn.query(
        'INSERT IGNORE INTO lessons (id, app_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
        [lessonId, appId, l.title, l.icon || '', i + 1]
      );
      for (let j = 0; j < l.words.length; j++) {
        const w = l.words[j];
        await conn.query(
          'INSERT IGNORE INTO lesson_words (id, lesson_id, text, image, phonetic, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
          [`${lessonId}-word-${j}`, lessonId, w.text, w.image || '', w.phonetic || '', j]
        );
        wordCount++;
      }
      for (let k = 0; k < (l.externalLinks || []).length; k++) {
        const lk = l.externalLinks[k];
        await conn.query(
          'INSERT IGNORE INTO lesson_links (lesson_id, text, url, sort_order) VALUES (?, ?, ?, ?)',
          [lessonId, lk.text || '', lk.url || '', k]
        );
        linkCount++;
      }
    }
    console.log(`Seeded ${LESSONS.length} lessons, ${wordCount} words, ${linkCount} links for app "${appId}".`);
  } finally {
    conn.release();
    pool.end();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
