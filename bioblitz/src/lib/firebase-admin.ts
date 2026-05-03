import * as admin from 'firebase-admin';

function getApp(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

function lazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const instance = getInstance();
      const value = (instance as never)[prop as never];
      return typeof value === 'function' ? (value as Function).bind(instance) : value;
    },
  });
}

export const adminAuth = lazyProxy<admin.auth.Auth>(() => getApp().auth());
export const adminFirestore = lazyProxy<admin.firestore.Firestore>(() => getApp().firestore());
export default admin;