import "server-only";
import { initializeApp, getApps, App, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import path from "path";
import fs from "fs";

const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");

let serviceAccount: Record<string, any> | undefined;
try {
  serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
} catch (err) {
  console.error("Failed to load Firebase service account JSON:", err);
  serviceAccount = undefined;
}

const app = !getApps().length && serviceAccount
  ? initializeApp({
      credential: cert(serviceAccount),
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
    console.error("Error verifying session cookie:", error);
    return null;
  }
}