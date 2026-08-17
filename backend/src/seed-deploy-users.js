require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const pool = require('./db');

// Self-contained list of users to seed (no external file dependencies required)
const USERS_TO_SEED = [
  // --- App: UNI English K1 (slug: uni-english-k1) ---
  {
    username: "Nguyễn Quỳnh Trang Seed 15",
    account: "0962633721",
    password: "24092020",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Nguyễn Hiền Thảo Chi Seed 15",
    account: "0982796111",
    password: "6012020",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Đỗ Xuân Minh Đăng Seed 15",
    account: "0975876495",
    password: "28112021",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Nguyễn Phi Minh Đức Seed 15",
    account: "0333713322",
    password: "11122021",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Trương Khánh Linh Seed 15",
    account: "0964931350",
    password: "28042021",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Nguyễn Đồng Minh Đức Seed 15",
    account: "0985162589",
    password: "26032021",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Nguyễn Thị Anh Thư Seed 15",
    account: "0339433388",
    password: "27012021",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Đỗ Thị Khánh Hương  Seed 15",
    account: "0365835375",
    password: "12345678",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Nguyễn Hoài Dương Seed 15",
    account: "0976747702",
    password: "9112020",
    role: "student",
    appSlug: "uni-english-k1",
  },
  {
    username: "Phạm Thừa Duy Anh Seed 15",
    account: "0968896096",
    password: "3052021",
    role: "student",
    appSlug: "uni-english-k1",
  },

  // --- App: UNI Little K (slug: uni-little-k) ---
  {
    username: "Nguyễn Ngọc Bảo An Seed 23",
    account: "0987292054",
    password: "07062022",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Nguyễn Tiến Trung Kiên Seed 23",
    account: "0868881182",
    password: "17102022",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Nguyễn Đình Duy Anh Seed 23",
    account: "0981955796",
    password: "07042022",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Phí Minh Thư Seed 23",
    account: "0977789105",
    password: "09112022",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Nguyễn Danh Nhật Nam Seed 23",
    account: "0392670818",
    password: "11092021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Hoàng Kim Hiếu Seed 23",
    account: "0966281146",
    password: "17022021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Trần Minh Khôi Seed 4",
    account: "0989106850",
    password: "10062021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Phan Tiến Khang Seed 4",
    account: "0388889901",
    password: "04092021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Phí Thùy Minh Ngọc Seed 4",
    account: "0962630693",
    password: "30052021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Hoàng Bảo Hân, Hoàng Kim Đức Seed 4",
    account: "0378409603",
    password: "23032021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Nguyễn Bách Anh Tuấn Seed 4",
    account: "0349595190",
    password: "19042021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Đỗ Đức Hiếu Seed 4",
    account: "0976289550",
    password: "31122021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Nguyễn Thảo Nguyên Seed 4",
    account: "0383704386",
    password: "01062021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Phan Ngọc Diệp Seed 4",
    account: "0368861360",
    password: "25072021",
    role: "student",
    appSlug: "uni-little-k",
  },
  {
    username: "Ngô Chí Kiên Seed 4",
    account: "0915903891",
    password: "06062021",
    role: "student",
    appSlug: "uni-little-k",
  },
];

async function seedDeployUsers() {
  console.log(`\x1b[36m--- Starting One-Time Deploy User Seeding ---\x1b[0m`);
  console.log(`Total users to seed: ${USERS_TO_SEED.length}\n`);

  const conn = await pool.getConnection();

  try {
    // 1. Fetch all existing apps from database
    const [appRows] = await conn.query('SELECT id, slug, name FROM apps');
    const appMap = new Map();
    for (const app of appRows) {
      if (app.slug) appMap.set(app.slug.toLowerCase(), app.id);
      if (app.id) appMap.set(app.id.toLowerCase(), app.id);
    }

    console.log('Detected Apps in Database:');
    appRows.forEach((a) => console.log(`  - [${a.slug}] id: ${a.id} ("${a.name}")`));
    console.log('');

    let successCount = 0;

    for (let i = 0; i < USERS_TO_SEED.length; i++) {
      const u = USERS_TO_SEED[i];
      const account = u.account.trim();
      const email = account.includes('@') ? account.toLowerCase() : `${account.toLowerCase()}@uni.edu.com`;
      const username = u.username.trim();
      const rawPassword = String(u.password).trim();
      const appSlug = u.appSlug.trim().toLowerCase();

      // Resolve app ID
      let targetAppId = appMap.get(appSlug);
      if (!targetAppId) {
        // If app doesn't exist, create it on the fly
        targetAppId = uuidv4();
        const appName = appSlug === 'uni-english-k1' ? 'UNI English K1' : (appSlug === 'uni-little-k' ? 'UNI Little K' : appSlug);
        console.log(`Creating missing app "${appName}" (${appSlug}) with ID ${targetAppId}...`);
        await conn.query(
          `INSERT INTO apps (id, slug, name, logo_path) VALUES (?, ?, ?, '')`,
          [targetAppId, appSlug, appName]
        );
        appMap.set(appSlug, targetAppId);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      const newId = uuidv4();

      // Upsert into user_profiles
      await conn.query(
        `INSERT INTO user_profiles (id, username, email, role, app_id, password_hash)
         VALUES (?, ?, ?, 'student', ?, ?)
         ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           role = 'student',
           password_hash = VALUES(password_hash)`,
        [newId, username, email, targetAppId, passwordHash]
      );

      successCount++;
      console.log(`  ✓ [${successCount}/${USERS_TO_SEED.length}] Seeded "${username}" (${email}) -> App: ${appSlug} (Password: ${rawPassword})`);
    }

    console.log(`\n\x1b[32m✔ Successfully seeded all ${successCount} users on deploy server!\x1b[0m\n`);
  } catch (err) {
    console.error('\x1b[31mSeeding failed:\x1b[0m', err);
    throw err;
  } finally {
    conn.release();
    pool.end();
  }
}

seedDeployUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
