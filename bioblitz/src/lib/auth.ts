import "server-only";
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import path from "path";

const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");

export const app = !getApps().length 
  ? initializeApp({
      credential: cert(serviceAccountPath), 
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    })
  : (getApps()[0] as App);

export async function getCurrentUser() {
  const session = (await cookies()).get("session")?.value;

  if (!session) {
    return null;
  }

  try {
    const decodedIdToken = await getAuth(app).verifySessionCookie(
      session,
      true
    );
    return decodedIdToken;
  } catch (error) {
    // Session cookie is invalid or expired.
    // This is an expected error and should not be logged as an error.
    return null;
  }
}