const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// 1. Path to your service account key file
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('\x1b[31mError: serviceAccountKey.json not found!\x1b[0m');
  console.error('Please download your service account key from the Firebase Console (Project Settings > Service accounts) and save it as:');
  console.error(`  ${SERVICE_ACCOUNT_PATH}\n`);
  process.exit(1);
}

// Initialize Firebase Admin SDK
const serviceAccount = require(SERVICE_ACCOUNT_PATH);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// CONFIGURABLE COLLECTION NAMES (Modify these if your Firestore structure is different)
const USERS_COLLECTION = 'users';              // Flat collection containing user profiles
const PROGRESS_COLLECTION = 'user_progress';   // Flat collection OR subcollection under users

async function exportData() {
  console.log('--- Firebase Firestore Data Export Tool ---');

  // 1. Export User Profiles
  console.log(`Fetching user profiles from collection: "${USERS_COLLECTION}"...`);
  const usersSnapshot = await db.collection(USERS_COLLECTION).get();
  
  if (usersSnapshot.empty) {
    console.log('\x1b[33mWarning: No user profiles found in Firestore.\x1b[0m');
  }

  const users = [];
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    users.push({
      id: doc.id, // We use Firestore document ID (often the Firebase Auth UID)
      username: data.username || data.displayName || data.email?.split('@')[0] || 'UnknownUser',
      email: data.email || '',
      role: data.role === 'admin' ? 'admin' : 'student',
      password_hash: data.password_hash || data.passwordHash || null, // Will hash a temp password if missing
      created_at: data.created_at || data.createdAt || null
    });
  });
  
  fs.writeFileSync(
    path.join(__dirname, 'users.json'), 
    JSON.stringify(users, null, 2), 
    'utf-8'
  );
  console.log(`\x1b[32mSuccessfully exported ${users.length} users to src/users.json\x1b[0m`);

  // 2. Export User Progress
  console.log('Fetching user progress data...');
  const progressList = [];

  // Method A: Check if progress is in a flat root-level collection
  const flatProgressSnapshot = await db.collection(PROGRESS_COLLECTION).get();
  
  if (!flatProgressSnapshot.empty) {
    console.log(`Found flat progress collection: "${PROGRESS_COLLECTION}"`);
    flatProgressSnapshot.forEach(doc => {
      const data = doc.data();
      progressList.push({
        user_id: data.user_id || data.userId || '',
        lesson_id: data.lesson_id || data.lessonId || '',
        learn_index: data.learn_index !== undefined ? data.learn_index : (data.learnIndex || 0),
        p2_stars: data.p2_stars || data.p2Stars || {},
        p3_score: data.p3_score !== undefined ? data.p3_score : (data.p3Score || null),
        p4_links_count: data.p4_links_count !== undefined ? data.p4_links_count : (data.p4LinksCount || 0),
        updated_at: data.updated_at || data.updatedAt || null
      });
    });
  } else {
    // Method B: Check if progress is nested under users (e.g., users/{userId}/progress/{lessonId})
    console.log('Flat progress collection empty. Checking for nested subcollections ("progress" under users)...');
    
    for (const user of users) {
      const subCollSnapshot = await db.collection(USERS_COLLECTION).doc(user.id).collection('progress').get();
      if (!subCollSnapshot.empty) {
        subCollSnapshot.forEach(doc => {
          const data = doc.data();
          progressList.push({
            user_id: user.id,
            lesson_id: doc.id, // lesson ID is often the document ID in a subcollection
            learn_index: data.learn_index !== undefined ? data.learn_index : (data.learnIndex || 0),
            p2_stars: data.p2_stars || data.p2Stars || {},
            p3_score: data.p3_score !== undefined ? data.p3_score : (data.p3Score || null),
            p4_links_count: data.p4_links_count !== undefined ? data.p4_links_count : (data.p4LinksCount || 0),
            updated_at: data.updated_at || data.updatedAt || null
          });
        });
      }
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'progress.json'), 
    JSON.stringify(progressList, null, 2), 
    'utf-8'
  );
  console.log(`\x1b[32mSuccessfully exported ${progressList.length} progress records to src/progress.json\x1b[0m`);
  console.log('\nMigration export complete! Next, run the import script to seed MySQL.');
}

exportData().catch(err => {
  console.error('\x1b[31mError exporting data from Firebase:\x1b[0m', err);
  process.exit(1);
});
