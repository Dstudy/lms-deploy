const pool = require('./db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

async function migrate() {
  console.log('Starting DB migration for multi-app & superadmin support...');

  const connection = await pool.getConnection();
  try {
    // 1. Create superadmins table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS superadmins (
        id            VARCHAR(36)  NOT NULL,
        username      VARCHAR(255) NOT NULL,
        email         VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_superadmin_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Created/verified superadmins table.');

    // 2. Create apps table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS apps (
        id          VARCHAR(36)   NOT NULL,
        slug        VARCHAR(64)   NOT NULL,
        name        VARCHAR(255)  NOT NULL,
        logo_path   VARCHAR(500)  NOT NULL DEFAULT '',
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✓ Created/verified apps table.');

    // 3. Check if default app exists, insert if not
    const [apps] = await connection.query('SELECT id FROM apps WHERE id = ?', ['default']);
    if (apps.length === 0) {
      await connection.query(`
        INSERT INTO apps (id, slug, name, logo_path)
        VALUES ('default', 'default', 'Default App', '')
      `);
      console.log('✓ Inserted default app.');
    }

    // 4. Add app_id to user_profiles
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM user_profiles LIKE 'app_id'
    `);
    if (columns.length === 0) {
      await connection.query(`
        ALTER TABLE user_profiles
        ADD COLUMN app_id VARCHAR(36) NULL AFTER role
      `);
      console.log('✓ Added app_id column to user_profiles.');

      // Update existing users to belong to the default app
      await connection.query(`
        UPDATE user_profiles SET app_id = 'default' WHERE app_id IS NULL
      `);
      console.log('✓ Updated existing users to default app.');

      // Make app_id NOT NULL and add foreign key
      await connection.query(`
        ALTER TABLE user_profiles
        MODIFY COLUMN app_id VARCHAR(36) NOT NULL
      `);
      await connection.query(`
        ALTER TABLE user_profiles
        ADD CONSTRAINT fk_user_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
      `);
      console.log('✓ Scoped app_id to NOT NULL with foreign key constraint.');
    }

    // 5. Drop uq_email global constraint and add uq_email_app
    const [indexes] = await connection.query(`
      SHOW INDEX FROM user_profiles WHERE Key_name = 'uq_email'
    `);
    if (indexes.length > 0) {
      await connection.query(`
        ALTER TABLE user_profiles DROP INDEX uq_email
      `);
      console.log('✓ Dropped global unique key uq_email.');
    }

    const [newIndexes] = await connection.query(`
      SHOW INDEX FROM user_profiles WHERE Key_name = 'uq_email_app'
    `);
    if (newIndexes.length === 0) {
      await connection.query(`
        ALTER TABLE user_profiles ADD UNIQUE KEY uq_email_app (email, app_id)
      `);
      console.log('✓ Added per-app unique key uq_email_app.');
    }

    // 6. Seed default superadmin if none exists
    const [superadmins] = await connection.query('SELECT id FROM superadmins LIMIT 1');
    if (superadmins.length === 0) {
      const id = uuidv4();
      const passwordHash = await bcrypt.hash('superadmin123', 10);
      await connection.query(`
        INSERT INTO superadmins (id, username, email, password_hash)
        VALUES (?, 'Super Admin', 'superadmin@lms.com', ?)
      `, [id, passwordHash]);
      console.log('✓ Seeded default superadmin account (email: superadmin@lms.com, password: superadmin123).');
    }

    console.log('DB Migration successfully completed!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

migrate();
