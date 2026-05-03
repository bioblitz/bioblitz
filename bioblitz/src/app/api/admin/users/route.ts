import { NextResponse } from "next/server";
import admin, { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { applyUsernamePolicy } from "@/lib/usernamePolicy";
import { applyTextPolicy } from "@/lib/textPolicy";
import { getAdminStats } from "@/lib/admin-cache";

export const dynamic = 'force-dynamic';

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
  const skipCache = searchParams.get("skipCache") === "true";

  // Fetch cached stats (or fresh if skipCache is set)
  const stats = await getAdminStats();

  if (statsOnly) {
    return NextResponse.json(stats);
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

  return NextResponse.json({
    users,
    submissionsCount: stats.submissionsCount,
    totalUsers: stats.totalUsers,
    totalContestsPlayed: stats.totalContestsPlayed,
    potdAttempts: stats.potdAttempts,
    potdCorrect: stats.potdCorrect,
    potdPublished: stats.potdPublished,
  });
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
        batch.update(ref, { subscriberCount: admin.firestore.FieldValue.increment(-1) });
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
            batch.update(d.ref, { subscriptions: admin.firestore.FieldValue.arrayRemove(uid) })
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
