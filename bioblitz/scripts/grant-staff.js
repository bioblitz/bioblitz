const path = require("path");
const admin = require("firebase-admin");

const identifier = process.argv[2];

if (!identifier) {
  console.error("Usage: node scripts/grant-staff.js <username-or-uid>");
  process.exit(1);
}

const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();
const auth = admin.auth();

function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return ["staff"];
  const next = new Set(roles.map((r) => String(r).toLowerCase().trim()).filter(Boolean));
  next.add("staff");
  return Array.from(next);
}

async function resolveUid(input) {
  const trimmed = String(input).trim();
  const normalized = trimmed.toLowerCase();

  const byUsername = await db
    .collection("users")
    .where("username", "==", normalized)
    .limit(1)
    .get();

  if (!byUsername.empty) {
    return byUsername.docs[0].id;
  }

  const byUid = await db.collection("users").doc(trimmed).get();
  if (byUid.exists) {
    return byUid.id;
  }

  return null;
}

async function main() {
  const uid = await resolveUid(identifier);

  if (!uid) {
    console.error(`No user found for: ${identifier}`);
    process.exit(1);
  }

  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();

  if (!snap.exists) {
    console.error(`User doc not found for uid: ${uid}`);
    process.exit(1);
  }

  const data = snap.data() || {};
  const roles = normalizeRoles(data.roles);

  await userRef.set({ roles }, { merge: true });

  try {
    const userRecord = await auth.getUser(uid);
    const existingClaims = userRecord.customClaims || {};
    await auth.setCustomUserClaims(uid, {
      ...existingClaims,
      roles,
    });
  } catch (err) {
    console.warn("Could not update custom claims (continuing):", err.message || err);
  }

  const username = data.username || "(no username)";
  console.log(`Granted staff role to uid=${uid}, username=${username}`);
}

main().catch((err) => {
  console.error("Failed to grant staff role:", err);
  process.exit(1);
});
