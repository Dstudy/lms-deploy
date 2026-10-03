require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

function parseCSVToRows(text) {
  let cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  cleanText = cleanText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (!cleanText.trim()) return [];

  const firstLine = cleanText.split('\n').find((l) => l.trim().length > 0) || '';
  let delimiter = ',';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  } else if (semicolonCount > commaCount) {
    delimiter = ';';
  }

  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function normalizeHeader(h) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseLessonsFromRawRows(rawRows) {
  if (rawRows.length < 2) return [];

  const headerRow = rawRows[0];
  const headerMap = {};

  headerRow.forEach((col, idx) => {
    const norm = normalizeHeader(col);
    if (!norm) return;

    if (['id', 'lessonid', 'lesson_id', 'lessoncode', 'code'].includes(norm)) {
      headerMap.lessonId = idx;
    } else if (['title', 'lessontitle', 'lessonname', 'name', 'topic', 'lesson'].includes(norm)) {
      if (headerMap.lessonId === undefined && (norm === 'lesson' || norm === 'id')) {
        headerMap.lessonId = idx;
      } else {
        headerMap.title = idx;
      }
    } else if (['icon', 'lessonicon', 'emoji', 'symbol'].includes(norm)) {
      headerMap.icon = idx;
    } else if (['sortorder', 'sort_order', 'order', 'sort', 'sequence', 'seq'].includes(norm)) {
      headerMap.sortOrder = idx;
    } else if (['word', 'wordtext', 'text', 'vocabulary', 'vocab', 'term'].includes(norm)) {
      headerMap.word = idx;
    } else if (['image', 'imageurl', 'img', 'photo', 'picture', 'pic'].includes(norm)) {
      headerMap.image = idx;
    } else if (['phonetic', 'ipa', 'pronunciation', 'sound'].includes(norm)) {
      headerMap.phonetic = idx;
    } else if (['linktitle', 'linktext', 'linkname', 'resourcetitle', 'linklabel', 'link'].includes(norm)) {
      if (norm === 'link' && headerMap.linkUrl === undefined) {
        headerMap.linkUrl = idx;
      } else {
        headerMap.linkTitle = idx;
      }
    } else if (['linkurl', 'url', 'href', 'resourceurl'].includes(norm)) {
      headerMap.linkUrl = idx;
    }
  });

  const lessonMap = new Map();
  const lessonOrder = [];
  let currentActiveLessonId = null;

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    const getVal = (idx) => (idx !== undefined && idx < row.length ? String(row[idx] ?? '').trim() : '');

    let rawLessonId = getVal(headerMap.lessonId);
    let rawTitle = getVal(headerMap.title);
    const rawIcon = getVal(headerMap.icon);
    const rawSortOrderStr = getVal(headerMap.sortOrder);
    const rawWord = getVal(headerMap.word);
    const rawImage = getVal(headerMap.image);
    const rawPhonetic = getVal(headerMap.phonetic);
    const rawLinkTitle = getVal(headerMap.linkTitle);
    const rawLinkUrl = getVal(headerMap.linkUrl);

    if (!rawLessonId && !rawTitle) {
      if (currentActiveLessonId && (rawWord || rawLinkUrl)) {
        rawLessonId = currentActiveLessonId;
      } else {
        continue;
      }
    }

    let finalLessonId = rawLessonId || rawTitle;
    let finalTitle = rawTitle || finalLessonId;
    currentActiveLessonId = finalLessonId;

    let lesson = lessonMap.get(finalLessonId);
    if (!lesson) {
      const parsedOrder = parseInt(rawSortOrderStr, 10);
      lesson = {
        id: finalLessonId,
        title: finalTitle,
        icon: rawIcon || '',
        sortOrder: Number.isFinite(parsedOrder) ? parsedOrder : lessonOrder.length + 1,
        words: [],
        externalLinks: [],
      };
      lessonMap.set(finalLessonId, lesson);
      lessonOrder.push(finalLessonId);
    } else {
      if (rawTitle && (!lesson.title || lesson.title === lesson.id)) lesson.title = rawTitle;
      if (rawIcon && !lesson.icon) lesson.icon = rawIcon;
      if (rawSortOrderStr && !Number.isFinite(lesson.sortOrder)) {
        const parsed = parseInt(rawSortOrderStr, 10);
        if (Number.isFinite(parsed)) lesson.sortOrder = parsed;
      }
    }

    if (rawWord) {
      const wordId = `${finalLessonId}-word-${lesson.words.length}`;
      lesson.words.push({
        id: wordId,
        text: rawWord,
        image: rawImage || '',
        phonetic: rawPhonetic || '',
      });
    }

    if (rawLinkUrl || rawLinkTitle) {
      lesson.externalLinks.push({
        text: rawLinkTitle || rawLinkUrl,
        url: rawLinkUrl || '',
      });
    }
  }

  return lessonOrder.map((id) => lessonMap.get(id));
}

async function insertWordsAndLinks(conn, lessonId, words, externalLinks) {
  if (words && words.length > 0) {
    const wordValues = words.map((w, j) => {
      const wordId = (w.id && String(w.id).startsWith(`${lessonId}-word-`))
        ? String(w.id)
        : `${lessonId}-word-${j}`;
      return [
        wordId,
        lessonId,
        String(w.text ?? ''),
        String(w.image ?? ''),
        String(w.phonetic ?? ''),
        j,
      ];
    });
    await conn.query(
      `INSERT INTO lesson_words (id, lesson_id, text, image, phonetic, sort_order) 
       VALUES ? 
       ON DUPLICATE KEY UPDATE 
         lesson_id = VALUES(lesson_id),
         text = VALUES(text), 
         image = VALUES(image), 
         phonetic = VALUES(phonetic), 
         sort_order = VALUES(sort_order)`,
      [wordValues]
    );
  }

  if (externalLinks && externalLinks.length > 0) {
    const linkValues = externalLinks.map((l, k) => [
      lessonId,
      String(l.text ?? ''),
      String(l.url ?? ''),
      k,
    ]);
    await conn.query(
      `INSERT INTO lesson_links (lesson_id, text, url, sort_order) 
       VALUES ? 
       ON DUPLICATE KEY UPDATE 
         text = VALUES(text), 
         url = VALUES(url)`,
      [linkValues]
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args[0];
  const targetApp = args[1];

  if (!csvPath) {
    console.log('Usage: node src/import-csv.js <path-to-csv> [app_slug_or_id]');
    console.log('Example: node src/import-csv.js ../lessons_import_get_to_know-v2.csv uni-english-k1');
    process.exit(1);
  }

  const resolvedPath = path.resolve(process.cwd(), csvPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const conn = await pool.getConnection();
  try {
    const [apps] = await conn.query('SELECT id, name, slug FROM apps');
    if (apps.length === 0) {
      console.error('No apps found in database.');
      process.exit(1);
    }

    let selectedApp = null;
    if (targetApp) {
      selectedApp = apps.find(a => a.id === targetApp || a.slug === targetApp);
      if (!selectedApp) {
        console.error(`App "${targetApp}" not found. Available apps:`);
        apps.forEach(a => console.log(` - ${a.name} (id: ${a.id}, slug: ${a.slug})`));
        process.exit(1);
      }
    } else {
      console.log('No app specified. Available apps:');
      apps.forEach((a, idx) => console.log(` [${idx + 1}] ${a.name} (slug: ${a.slug}, id: ${a.id})`));
      console.log(`\nDefaulting to first app: ${apps[0].name} (${apps[0].slug})`);
      selectedApp = apps[0];
    }

    const appId = selectedApp.id;
    const appSlug = selectedApp.slug || appId;
    console.log(`\nImporting to App: "${selectedApp.name}" (id: ${appId}, slug: ${appSlug})`);

    const csvText = fs.readFileSync(resolvedPath, 'utf8');
    const rawRows = parseCSVToRows(csvText);
    const lessons = parseLessonsFromRawRows(rawRows);

    if (lessons.length === 0) {
      console.error('No lessons found in CSV.');
      process.exit(1);
    }

    let totalWordsCount = 0;
    lessons.forEach(l => { totalWordsCount += l.words.length; });
    console.log(`Found ${lessons.length} lessons and ${totalWordsCount} words in CSV.\n`);

    await conn.beginTransaction();

    let createdCount = 0;
    let updatedCount = 0;
    let wordsCount = 0;
    let linksCount = 0;

    for (let i = 0; i < lessons.length; i++) {
      const item = lessons[i];
      let lessonId = String(item.id || '').trim();
      const title = String(item.title || '').trim();
      const icon = String(item.icon || '').trim();
      const sortOrder = item.sortOrder;
      const words = item.words;
      const externalLinks = item.externalLinks;

      let [[existing]] = await conn.query(
        'SELECT id FROM lessons WHERE id = ? AND app_id = ?',
        [lessonId, appId]
      );

      if (!existing) {
        const [[otherAppLesson]] = await conn.query(
          'SELECT id, app_id FROM lessons WHERE id = ?',
          [lessonId]
        );
        if (otherAppLesson && otherAppLesson.app_id !== appId) {
          const scopedId = `${appSlug}-${lessonId}`;
          lessonId = scopedId;

          const [[scopedExisting]] = await conn.query(
            'SELECT id FROM lessons WHERE id = ? AND app_id = ?',
            [lessonId, appId]
          );
          if (scopedExisting) existing = scopedExisting;
        }
      }

      if (existing) {
        await conn.query(
          'UPDATE lessons SET title = ?, icon = ?, sort_order = ? WHERE id = ? AND app_id = ?',
          [title, icon, sortOrder, lessonId, appId]
        );
        await conn.query('DELETE FROM lesson_words WHERE lesson_id = ?', [lessonId]);
        await conn.query('DELETE FROM lesson_links WHERE lesson_id = ?', [lessonId]);
        await insertWordsAndLinks(conn, lessonId, words, externalLinks);
        updatedCount++;
      } else {
        await conn.query(
          'INSERT INTO lessons (id, app_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
          [lessonId, appId, title, icon, sortOrder]
        );
        await conn.query('DELETE FROM lesson_words WHERE lesson_id = ?', [lessonId]);
        await conn.query('DELETE FROM lesson_links WHERE lesson_id = ?', [lessonId]);
        await insertWordsAndLinks(conn, lessonId, words, externalLinks);
        createdCount++;
      }

      wordsCount += words.length;
      linksCount += externalLinks.length;
      console.log(` ✔ [${i + 1}/${lessons.length}] Lesson "${title}" (${lessonId}): ${words.length} words, ${externalLinks.length} links`);
    }

    await conn.commit();
    console.log(`\n🎉 Successfully imported into "${selectedApp.name}"!`);
    console.log(`Summary: ${createdCount} created, ${updatedCount} updated, ${wordsCount} vocabulary words, ${linksCount} links.`);
  } catch (err) {
    await conn.rollback();
    console.error('Import failed with error:', err);
    process.exit(1);
  } finally {
    conn.release();
    pool.end();
  }
}

main();
