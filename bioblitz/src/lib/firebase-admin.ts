import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!))
    });
  } catch (error) {
    console.log('Firebase admin initialization error', error.stack);
  }
}

export default admin;
export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
