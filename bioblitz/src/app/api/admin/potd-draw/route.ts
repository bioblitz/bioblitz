import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import admin from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminFirestore.collection("users").doc(decoded.uid).get();
  const roles: string[] = userDoc.data()?.roles ?? [];
  const isAdmin =
    decoded.admin === true ||
    roles.map((r) => String(r).toLowerCase()).includes("admin");
  if (!isAdmin) throw new Error("Forbidden");
  return decoded;
}

function currentMonthPst() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }).slice(0, 7);
}

// GET — return this month's submission leaderboard + all-time stats
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || currentMonthPst(); // "YYYY-MM"

  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  // Fetch this month's published POTDs that have a real submittedBy UID
  const potdSnap = await adminFirestore
    .collection("potd")
    .where("date", ">=", monthStart)
    .where("date", "<=", monthEnd)
    .get();

  const countsByUid: Record<string, number> = {};
  for (const doc of potdSnap.docs) {
    const uid = doc.data().submittedBy;
    if (!uid || uid === "scheduler" || uid === "manual-script") continue;
    countsByUid[uid] = (countsByUid[uid] ?? 0) + 1;
  }

  // Fetch display names
  const uids = Object.keys(countsByUid);
  const userDocs = await Promise.all(
    uids.map((uid) => adminFirestore.collection("users").doc(uid).get())
  );

  const leaderboard = uids
    .map((uid, i) => ({
      uid,
      displayName: userDocs[i].data()?.displayName || userDocs[i].data()?.username || uid,
      username: userDocs[i].data()?.username || "",
      entries: countsByUid[uid],
    }))
    .sort((a, b) => b.entries - a.entries);

  const totalEntries = leaderboard.reduce((s, u) => s + u.entries, 0);

  // All-time stats from stats/global
  let potdAttempts = 0;
  let potdCorrect = 0;
  let potdPublished = 0;
  try {
    const statsDoc = await adminFirestore.collection("stats").doc("global").get();
    potdAttempts = statsDoc.data()?.potdAttempts ?? 0;
    potdCorrect = statsDoc.data()?.potdCorrect ?? 0;
  } catch {}
  try {
    const snap = await adminFirestore.collection("potd").get();
    potdPublished = snap.size;
  } catch {}

  return NextResponse.json({
    month,
    totalEntries,
    totalContributors: leaderboard.length,
    leaderboard,
    globalStats: { potdPublished, potdAttempts, potdCorrect },
  });
}

// POST — perform a weighted random draw for the given month
export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
  }

  const body = await request.json().catch(() => ({}));
  const month = body?.month || currentMonthPst();

  const monthStart = `${month}-01`;
  const monthEnd = `${month}-31`;

  const potdSnap = await adminFirestore
    .collection("potd")
    .where("date", ">=", monthStart)
    .where("date", "<=", monthEnd)
    .get();

  // Build entry pool: one entry per POTD submitted by a real user
  const pool: { uid: string }[] = [];
  const countsByUid: Record<string, number> = {};

  for (const doc of potdSnap.docs) {
    const uid = doc.data().submittedBy;
    if (!uid || uid === "scheduler" || uid === "manual-script") continue;
    pool.push({ uid });
    countsByUid[uid] = (countsByUid[uid] ?? 0) + 1;
  }

  if (pool.length === 0) {
    return NextResponse.json(
      { error: "No eligible POTD submissions found for this month." },
      { status: 400 }
    );
  }

  const winnerEntry = pool[Math.floor(Math.random() * pool.length)];
  const winnerDoc = await adminFirestore.collection("users").doc(winnerEntry.uid).get();

  const winner = {
    uid: winnerEntry.uid,
    displayName: winnerDoc.data()?.displayName || winnerDoc.data()?.username || winnerEntry.uid,
    username: winnerDoc.data()?.username || "",
    entries: countsByUid[winnerEntry.uid],
  };

  // Persist draw result
  await adminFirestore.collection("potdDrawResults").add({
    month,
    winner,
    totalEntries: pool.length,
    drawnAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ winner, totalEntries: pool.length, month });
}
