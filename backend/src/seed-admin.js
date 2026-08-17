require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL    = 'admin@lms.local';
const ADMIN_PASSWORD = 'Admin@1234';

async function seed() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const id = uuidv4();

  const [result] = await pool.execute(
    `INSERT IGNORE INTO user_profiles (id, username, email, role, password_hash)
     VALUES (?, ?, ?, 'admin', ?)`,
    [id, ADMIN_USERNAME, ADMIN_EMAIL, passwordHash]
  );

  if (result.affectedRows === 0) {
    console.log(`Admin already exists: ${ADMIN_EMAIL}`);
  } else {
    console.log(`Admin created — email: ${ADMIN_EMAIL}  password: ${ADMIN_PASSWORD}`);
  }

  pool.end();
}

seed().catch((err) => { console.error(err); process.exit(1); });
