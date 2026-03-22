import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";

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
    // Bookmarks have IDs like {gameId}_q{index}, so we can query by prefix
    const usersSnap = await adminFirestore.collection("users").get();
    let bookmarksDeleted = 0;

    // Process in batches of 10 users at a time
    const userDocs = usersSnap.docs;
    for (let i = 0; i < userDocs.length; i += 10) {
      const chunk = userDocs.slice(i, i + 10);
      await Promise.all(
        chunk.map(async (userDoc) => {
          const bookmarksRef = userDoc.ref
            .collection("bookmarkedQuestions")
            .where("gameId", "==", gameId);
          const bookmarksSnap = await bookmarksRef.get();
          if (!bookmarksSnap.empty) {
            const batch = adminFirestore.batch();
            bookmarksSnap.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            bookmarksDeleted += bookmarksSnap.size;
          }
        }),
      );
    }

    // 6. Remove gameId from users' playedGameIds arrays
    for (let i = 0; i < userDocs.length; i += 10) {
      const chunk = userDocs.slice(i, i + 10);
      await Promise.all(
        chunk.map(async (userDoc) => {
          const data = userDoc.data();
          const playedIds = Array.isArray(data.playedGameIds)
            ? data.playedGameIds
            : [];
          if (playedIds.includes(gameId)) {
            await userDoc.ref.update({
              playedGameIds: playedIds.filter((id: string) => id !== gameId),
            });
          }
        }),
      );
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
