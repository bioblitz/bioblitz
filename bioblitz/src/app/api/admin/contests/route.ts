import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
}

async function requireAdmin(request: Request): Promise<{ uid: string }> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Unauthorized");

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  const roles = normalizeRoles(decoded.roles);
  let admin =
    decoded.admin === true ||
    decoded.role === "admin" ||
    roles.includes("admin");

  if (!admin) {
    const userDoc = await adminFirestore.collection("users").doc(uid).get();
    const docRoles = normalizeRoles(userDoc.data()?.roles);
    admin = docRoles.includes("admin");
  }

  if (!admin) throw new Error("Forbidden");
  return { uid };
}

async function deleteCollection(
  collectionRef: FirebaseFirestore.Query,
  batchSize = 100,
) {
  let totalDeleted = 0;
  let snapshot = await collectionRef.limit(batchSize).get();

  while (!snapshot.empty) {
    const batch = adminFirestore.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;
    snapshot = await collectionRef.limit(batchSize).get();
  }

  return totalDeleted;
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json(
      { error: err?.message || "Unauthorized" },
      { status },
    );
  }

  const body = await request.json();
  const gameId = String(body?.gameId || "").trim();

  if (!gameId) {
    return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
  }

  // Verify the set exists
  const setDoc = await adminFirestore.collection("sets").doc(gameId).get();
  if (!setDoc.exists) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  try {
    // 1. Delete questions subcollection
    const questionsRef = adminFirestore
      .collection("sets")
      .doc(gameId)
      .collection("questions");
    await deleteCollection(questionsRef);

    // 2. Delete the set document itself
    await adminFirestore.collection("sets").doc(gameId).delete();

    // 3. Delete all gameSubmissions for this game
    const submissionsRef = adminFirestore
      .collection("gameSubmissions")
      .where("gameId", "==", gameId);
    await deleteCollection(submissionsRef);

    // 4. Delete all questionReports for this game
    const reportsRef = adminFirestore
      .collection("questionReports")
      .where("gameId", "==", gameId);
    await deleteCollection(reportsRef);

    // 5. Delete all bookmarkedQuestions across all users for this game
    const bookmarksSnap = await adminFirestore
      .collectionGroup("bookmarkedQuestions")
      .where("gameId", "==", gameId)
      .get();
    
    if (!bookmarksSnap.empty) {
      const chunks = [];
      for (let i = 0; i < bookmarksSnap.docs.length; i += 500) {
        chunks.push(bookmarksSnap.docs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = adminFirestore.batch();
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    // 6. Remove gameId from users' playedGameIds arrays + collect affected UIDs
    const usersWithGameSnap = await adminFirestore
      .collection("users")
      .where("playedGameIds", "array-contains", gameId)
      .get();

    const affectedUids: string[] = [];

    if (!usersWithGameSnap.empty) {
      const chunks = [];
      for (let i = 0; i < usersWithGameSnap.docs.length; i += 500) {
        chunks.push(usersWithGameSnap.docs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = adminFirestore.batch();
        chunk.forEach((userDoc) => {
          affectedUids.push(userDoc.id);
          const data = userDoc.data();
          const playedIds = Array.isArray(data.playedGameIds)
            ? data.playedGameIds
            : [];
          batch.update(userDoc.ref, {
            playedGameIds: playedIds.filter((id: string) => id !== gameId),
          });
        });
        await batch.commit();
      }
    }

    // 7. Delete setsPlayed/{gameId} doc for each affected user
    if (affectedUids.length > 0) {
      const chunks = [];
      for (let i = 0; i < affectedUids.length; i += 500) {
        chunks.push(affectedUids.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = adminFirestore.batch();
        chunk.forEach((uid) => {
          const ref = adminFirestore
            .collection("users")
            .doc(uid)
            .collection("setsPlayed")
            .doc(gameId);
          batch.delete(ref);
        });
        await batch.commit();
      }
    }

    // 8. Delete ratingHistory entries where contestId == gameId
    const ratingHistorySnap = await adminFirestore
      .collectionGroup("ratingHistory")
      .where("contestId", "==", gameId)
      .get();

    if (!ratingHistorySnap.empty) {
      const chunks = [];
      for (let i = 0; i < ratingHistorySnap.docs.length; i += 500) {
        chunks.push(ratingHistorySnap.docs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = adminFirestore.batch();
        chunk.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    return NextResponse.json({
      message: "Contest deleted.",
      gameId,
    });
  } catch (err: any) {
    console.error("Error deleting contest:", err);
    return NextResponse.json(
      { error: "Failed to delete contest." },
      { status: 500 },
    );
  }
}
