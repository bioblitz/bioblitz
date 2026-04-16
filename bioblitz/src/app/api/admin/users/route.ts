import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { applyUsernamePolicy } from "@/lib/usernamePolicy";
import { applyTextPolicy } from "@/lib/textPolicy";

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value?.seconds === "number") return new Date(value.seconds * 1000);
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => String(r).toLowerCase().trim())
    .filter(Boolean);
}

function isAdminFromClaims(claims: any): boolean {
  const roles = normalizeRoles(claims?.roles);
  return claims?.admin === true || claims?.role === "admin" || roles.includes("admin");
}

async function requireAdmin(request: Request): Promise<{ uid: string }> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  let admin = isAdminFromClaims(decoded);
  if (!admin) {
    const userDoc = await adminFirestore.collection("users").doc(uid).get();
    const roles = normalizeRoles(userDoc.data()?.roles);
    admin = roles.includes("admin");
  }

  if (!admin) {
    throw new Error("Forbidden");
  }

  return { uid };
}

function formatCreatedAt(value: any): string | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(request.url);
  const statsOnly = searchParams.get("statsOnly") === "true";

  let submissionsCount = 0;
  let totalUsers = 0;
  let dau = 0;
  let wau = 0;
  let mau = 0;
  let week1Retention = 0;
  let month1Retention = 0;
  let potdAttempts = 0;
  let potdCorrect = 0;
  let potdPublished = 0;

  try {
    const submissionsSnap = await adminFirestore.collection("gameSubmissions").count().get();
    submissionsCount = submissionsSnap.data().count;
  } catch (err) {
    submissionsCount = 0;
  }

  try {
    const usersCountSnap = await adminFirestore.collection("users").count().get();
    totalUsers = usersCountSnap.data().count;
  } catch (err) {
    totalUsers = 0;
  }

  try {
    const usersSnap = await adminFirestore.collection("users").select("createdAt", "lastActive").get();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const active1dCutoff = now - dayMs;
    const active7dCutoff = now - 7 * dayMs;
    const active30dCutoff = now - 30 * dayMs;

    let eligibleWeek1 = 0;
    let retainedWeek1 = 0;
    let eligibleMonth1 = 0;
    let retainedMonth1 = 0;

    usersSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const createdAt = toDate(data.createdAt);
      const lastActive = toDate(data.lastActive) || toDate(data.lastLogin);

      if (!lastActive) return;
      const lastActiveMs = lastActive.getTime();
      if (lastActiveMs >= active1dCutoff) dau += 1;
      if (lastActiveMs >= active7dCutoff) wau += 1;
      if (lastActiveMs >= active30dCutoff) mau += 1;

      if (!createdAt) return;
      const createdMs = createdAt.getTime();
      const ageDays = (now - createdMs) / dayMs;

      if (ageDays >= 7) {
        eligibleWeek1 += 1;
        if (lastActiveMs >= createdMs + 7 * dayMs) retainedWeek1 += 1;
      }

      if (ageDays >= 30) {
        eligibleMonth1 += 1;
        if (lastActiveMs >= createdMs + 30 * dayMs) retainedMonth1 += 1;
      }
    });

    week1Retention = eligibleWeek1 > 0 ? retainedWeek1 / eligibleWeek1 : 0;
    month1Retention = eligibleMonth1 > 0 ? retainedMonth1 / eligibleMonth1 : 0;
  } catch {
    dau = 0;
    wau = 0;
    mau = 0;
    week1Retention = 0;
    month1Retention = 0;
  }

  try {
    const statsDoc = await adminFirestore.collection("stats").doc("global").get();
    if (statsDoc.exists) {
      potdAttempts = statsDoc.data()?.potdAttempts || 0;
      potdCorrect = statsDoc.data()?.potdCorrect || 0;
    }
  } catch {}

  try {
    const potdSnap = await adminFirestore.collection("potd").count().get();
    potdPublished = potdSnap.data().count;
  } catch {}

  if (statsOnly) {
    return NextResponse.json({
      submissionsCount,
      totalUsers,
      potdAttempts,
      potdCorrect,
      potdPublished,
      analytics: {
        dau,
        wau,
        mau,
        stickiness: mau > 0 ? dau / mau : 0,
        week1Retention,
        month1Retention,
      },
    });
  }

  // Username lookup — returns a single user's full profile
  const usernameQuery = searchParams.get("username");
  if (usernameQuery) {
    const snap = await adminFirestore
      .collection("users")
      .where("username", "==", usernameQuery.trim().toLowerCase())
      .limit(1)
      .get();
    if (snap.empty) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const docSnap = snap.docs[0];
    const data = docSnap.data() as any;
    return NextResponse.json({
      user: {
        uid: docSnap.id,
        displayName: data.displayName || "",
        username: data.username || "",
        email: data.email || "",
        roles: normalizeRoles(data.roles),
        bElo: data.bElo ?? 500,
        bio: data.bio || "",
        location: data.location || "",
        grade: data.grade || "",
        school: data.school || "",
        contestsPlayed: data.contestsPlayed ?? 0,
        createdAt: formatCreatedAt(data.createdAt),
      },
    });
  }

  const usersSnap = await adminFirestore.collection("users").get();
  const users = usersSnap.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      uid: docSnap.id,
      displayName: data.displayName || "",
      username: data.username || "",
      email: data.email || "",
      roles: normalizeRoles(data.roles),
      createdAt: formatCreatedAt(data.createdAt),
    };
  });

  return NextResponse.json({ users, submissionsCount, totalUsers, potdAttempts, potdCorrect, potdPublished });
}

export async function DELETE(request: Request) {
  let actingUid = "";
  try {
    const admin = await requireAdmin(request);
    actingUid = admin.uid;
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const uid = String(body?.uid || "").trim();

  if (!uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }

  if (uid === actingUid) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  // Fetch user doc before deletion to get subscriptions
  const userDoc = await adminFirestore.collection("users").doc(uid).get();
  const userData = userDoc.data() as any;

  try {
    await adminAuth.deleteUser(uid);
  } catch (err: any) {
    if (err?.code !== "auth/user-not-found") {
      return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
    }
  }

  // Run cleanup in parallel where possible
  await Promise.all([
    // 1. Delete user doc
    adminFirestore.collection("users").doc(uid).delete(),

    // 2. Delete notifications sent to this user
    (async () => {
      const notifSnap = await adminFirestore
        .collection("notifications")
        .where("recipientUid", "==", uid)
        .get();
      if (!notifSnap.empty) {
        const batch = adminFirestore.batch();
        notifSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    })(),

    // 3. Remove this user from other users' friends subcollections
    (async () => {
      const friendsSnap = await adminFirestore
        .collectionGroup("friends")
        .where("uid", "==", uid)
        .get();
      if (!friendsSnap.empty) {
        const chunks: typeof friendsSnap.docs[] = [];
        for (let i = 0; i < friendsSnap.docs.length; i += 500) {
          chunks.push(friendsSnap.docs.slice(i, i + 500));
        }
        for (const chunk of chunks) {
          const batch = adminFirestore.batch();
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    })(),

    // 4. Decrement subscriberCount on channels this user subscribed to
    (async () => {
      const subscriptions: string[] = Array.isArray(userData?.subscriptions)
        ? userData.subscriptions
        : [];
      if (subscriptions.length === 0) return;
      const batch = adminFirestore.batch();
      subscriptions.forEach((channelUid) => {
        const ref = adminFirestore.collection("users").doc(channelUid);
        batch.update(ref, { subscriberCount: FieldValue.increment(-1) });
      });
      await batch.commit();
    })(),

    // 5. Remove this user's UID from others' subscriptions arrays (they subscribed to this channel)
    (async () => {
      const subscribersSnap = await adminFirestore
        .collection("users")
        .where("subscriptions", "array-contains", uid)
        .get();
      if (!subscribersSnap.empty) {
        const chunks: typeof subscribersSnap.docs[] = [];
        for (let i = 0; i < subscribersSnap.docs.length; i += 500) {
          chunks.push(subscribersSnap.docs.slice(i, i + 500));
        }
        for (const chunk of chunks) {
          const batch = adminFirestore.batch();
          chunk.forEach((d) =>
            batch.update(d.ref, { subscriptions: FieldValue.arrayRemove(uid) })
          );
          await batch.commit();
        }
      }
    })(),

    // 6. Delete search_index entries for this user and their channel
    adminFirestore.collection("search_index").doc(`user_${uid}`).delete().catch(() => {}),
    adminFirestore.collection("search_index").doc(`channel_${uid}`).delete().catch(() => {}),
  ]);

  return NextResponse.json({ message: "User deleted." });
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const uid = String(body?.uid || "").trim();
  if (!uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }

  const displayNameRaw = String(body?.displayName ?? "").trim();
  const rawUsername = String(body?.username ?? "").trim();
  const { value: displayName } = await applyTextPolicy(displayNameRaw);
  const { value: censoredUsername, censored } = await applyUsernamePolicy(rawUsername);
  if (censored) {
    return NextResponse.json({ error: "Inappropriate username, try again." }, { status: 400 });
  }
  const username = censoredUsername || "";

  if (username) {
    const existing = await adminFirestore
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();
    if (!existing.empty && existing.docs[0].id !== uid) {
      return NextResponse.json({ error: "Username already in use." }, { status: 409 });
    }
  }

  const update: Record<string, any> = {
    displayName,
    username: username || null,
  };

  if (body?.bio !== undefined) update.bio = String(body.bio).trim();
  if (body?.location !== undefined) update.location = String(body.location).trim();
  if (body?.grade !== undefined) update.grade = String(body.grade).trim();
  if (body?.school !== undefined) update.school = String(body.school).trim();
  if (body?.bElo !== undefined) {
    const elo = Number(body.bElo);
    if (!isNaN(elo)) update.bElo = Math.round(elo);
  }
  if (body?.contestsPlayed !== undefined) {
    const cp = Number(body.contestsPlayed);
    if (!isNaN(cp)) update.contestsPlayed = Math.max(0, Math.round(cp));
  }

  await adminFirestore.collection("users").doc(uid).set(update, { merge: true });
  return NextResponse.json({ message: "User updated." });
}
