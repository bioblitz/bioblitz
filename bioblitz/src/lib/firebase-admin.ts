import * as admin from 'firebase-admin';
import path from 'path';

const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

export const adminAuth = admin.auth();
export const adminFirestore = admin.firestore();
export default admin;