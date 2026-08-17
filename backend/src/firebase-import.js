const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const pool = require('./db');

const USERS_JSON_PATH = path.join(__dirname, 'users.json');
const PROGRESS_JSON_PATH = path.join(__dirname, 'progress.json');
const DEFAULT_PASSWORD = 'ChangeMe@2026!'; // Default password for users migrating from Firebase Auth

async function importData() {
  console.log('--- MySQL Import/Seeding Tool ---');

  // 1. Check if files exist
  if (!fs.existsSync(USERS_JSON_PATH) || !fs.existsSync(PROGRESS_JSON_PATH)) {
    console.error('\x1b[31mError: Exported JSON files not found in src/!\x1b[0m');
    console.error('Please run the export script first:');
    console.error('  node src/firebase-export.js\n');
    process.exit(1);
  }

  // Read JSON files
  const users = JSON.parse(fs.readFileSync(USERS_JSON_PATH, 'utf-8'));
  const progressList = JSON.parse(fs.readFileSync(PROGRESS_JSON_PATH, 'utf-8'));

  console.log(`Loaded ${users.length} users and ${progressList.length} progress records.`);

  // 2. Import Users
  console.log('\nImporting user profiles...');
  let importedUsersCount = 0;
  
  // Pre-hash the default password once to speed up execution
  console.log(`Hashing default password ("${DEFAULT_PASSWORD}") for users without existing password hashes...`);
  const defaultPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const user of users) {
    let passwordHash = user.password_hash;
    if (!passwordHash) {
      // If the user used Firebase Auth, they won't have a password hash in Firestore
      passwordHash = defaultPasswordHash;
    }

    // Convert date string/object to MySQL TIMESTAMP format (YYYY-MM-DD HH:MM:SS)
    let createdAt = null;
    if (user.created_at) {
      // Handles both Firestore Timestamp serialized object { _seconds, _nanoseconds } and ISO strings
      if (user.created_at._seconds) {
        createdAt = new Date(user.created_at._seconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
      } else {
        createdAt = new Date(user.created_at).toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    try {
      await pool.execute(
        `INSERT INTO user_profiles (id, username, email, role, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
         ON DUPLICATE KEY UPDATE 
           username = VALUES(username), 
           role = VALUES(role), 
           password_hash = VALUES(password_hash)`,
        [user.id, user.username, user.email, user.role, passwordHash, createdAt]
      );
      importedUsersCount++;
    } catch (err) {
      console.error(`\x1b[31mFailed to import user ${user.email}:\x1b[0m`, err.message);
    }
  }
  console.log(`\x1b[32mSuccessfully imported/updated ${importedUsersCount}/${users.length} users in MySQL.\x1b[0m`);

  // 3. Import Progress Records
  console.log('\nImporting user progress records...');
  let importedProgressCount = 0;

  for (const progress of progressList) {
    if (!progress.user_id || !progress.lesson_id) {
      console.warn('\x1b[33mSkipping progress record: missing user_id or lesson_id\x1b[0m', progress);
      continue;
    }

    // Format p2_stars: Must be a string in MySQL
    let p2StarsStr = '{}';
    if (progress.p2_stars) {
      p2StarsStr = typeof progress.p2_stars === 'string' ? progress.p2_stars : JSON.stringify(progress.p2_stars);
    }

    // Convert updated_at date
    let updatedAt = null;
    if (progress.updated_at) {
      if (progress.updated_at._seconds) {
        updatedAt = new Date(progress.updated_at._seconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
      } else {
        updatedAt = new Date(progress.updated_at).toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    try {
      await pool.execute(
        `INSERT INTO user_progress (user_id, lesson_id, learn_index, p2_stars, p3_score, p4_links_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
         ON DUPLICATE KEY UPDATE
           learn_index = VALUES(learn_index),
           p2_stars = VALUES(p2_stars),
           p3_score = VALUES(p3_score),
           p4_links_count = VALUES(p4_links_count)`,
        [
          progress.user_id, 
          progress.lesson_id, 
          progress.learn_index, 
          p2StarsStr, 
          progress.p3_score, 
          progress.p4_links_count, 
          updatedAt
        ]
      );
      importedProgressCount++;
    } catch (err) {
      // If foreign key constraint fails (e.g. user_id doesn't exist in user_profiles)
      console.error(`\x1b[31mFailed to import progress for user ${progress.user_id}, lesson ${progress.lesson_id}:\x1b[0m`, err.message);
    }
  }
  console.log(`\x1b[32mSuccessfully imported/updated ${importedProgressCount}/${progressList.length} progress records in MySQL.\x1b[0m`);

  console.log('\nData migration and seeding complete!');
  pool.end();
}

importData().catch(err => {
  console.error('\x1b[31mError during MySQL seeding:\x1b[0m', err);
  pool.end();
  process.exit(1);
});
