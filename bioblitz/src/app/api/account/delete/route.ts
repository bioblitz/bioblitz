import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import admin, { adminAuth, adminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

/** How recently the caller must have actually signed in to delete themselves. */
const RECENT_LOGIN_MAX_AGE_MS = 10 * 60 * 1000;

async function deleteInChunks(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): Promise<void> {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = adminFirestore.batch();
    docs.slice(i, i + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

/**
 * Deletes the caller's own account.
 *
 * This runs on the server because most of the work is denied to the client by
 * design, and those rules are worth keeping: `gameSubmissions` is delete-only
 * from the server so nobody can erase a first attempt and re-roll their Elo on
 * a set, and nobody can reach into another person's `friends` subcollection.
 * A self-serve deletion needs exactly those powers, so it is done here with
 * the Admin SDK, for the one uid the caller has proven they own.
 */
export async function POST(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let uid: string;
  try {
    // `checkRevoked` matters here: a token issued before a password reset or a
    // session revocation should not be able to delete the account.
    const decoded = await adminAuth.verifyIdToken(token, true);
    uid = decoded.uid;

    // Deleting an account is irreversible, so it is gated on a sign-in that
    // actually happened just now — not merely an ID token that is still valid.
    const authAgeMs = Date.now() - decoded.auth_time * 1000;
    if (authAgeMs > RECENT_LOGIN_MAX_AGE_MS) {
      return NextResponse.json(
        {
          error: "For security, sign in again to confirm deletion.",
          code: "requires-recent-login",
        },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Your session has expired — sign in again." },
      { status: 401 },
    );
  }

  try {
    const userRef = adminFirestore.collection("users").doc(uid);
    const userData = (await userRef.get()).data() || {};

    const [submissions, ownFriends, notifications, subscribers] =
      await Promise.all([
        adminFirestore
          .collection("gameSubmissions")
          .where("userId", "==", uid)
          .get(),
        adminFirestore.collection("users").doc(uid).collection("friends").get(),
        adminFirestore
          .collection("notifications")
          .where("recipientUid", "==", uid)
          .get(),
        adminFirestore
          .collection("users")
          .where("subscriptions", "array-contains", uid)
          .get(),
      ]);

    await deleteInChunks(submissions.docs);
    await deleteInChunks(notifications.docs);

    // Their entry in the other side of each friendship. Walked from their own
    // friend list rather than with a `collectionGroup("friends")` query, which
    // would need a collection-group index that is not deployed — and this is
    // exact for reciprocal links, which is what the app creates.
    for (let i = 0; i < ownFriends.docs.length; i += 400) {
      const batch = adminFirestore.batch();
      ownFriends.docs.slice(i, i + 400).forEach((friend) =>
        batch.delete(
          adminFirestore
            .collection("users")
            .doc(friend.id)
            .collection("friends")
            .doc(uid),
        ),
      );
      await batch.commit();
    }

    // Anything one-sided (a request that was never reciprocated) needs the
    // collection-group sweep. It is best-effort: without the index it throws,
    // and a missing index must not block someone deleting their account.
    try {
      const strays = await adminFirestore
        .collectionGroup("friends")
        .where("uid", "==", uid)
        .get();
      await deleteInChunks(strays.docs);
    } catch (err) {
      console.warn(
        `Could not sweep one-sided friend entries for ${uid} (needs a collection-group index on friends.uid):`,
        err,
      );
    }

    // Channels they subscribed to lose a subscriber; anyone subscribed to them
    // loses a dead entry.
    const subscriptions: string[] = Array.isArray(userData.subscriptions)
      ? userData.subscriptions
      : [];
    if (subscriptions.length > 0) {
      const batch = adminFirestore.batch();
      subscriptions.forEach((channelUid) => {
        batch.update(adminFirestore.collection("users").doc(channelUid), {
          subscriberCount: admin.firestore.FieldValue.increment(-1),
        });
      });
      await batch.commit().catch(() => {});
    }
    for (let i = 0; i < subscribers.docs.length; i += 400) {
      const batch = adminFirestore.batch();
      subscribers.docs.slice(i, i + 400).forEach((doc) =>
        batch.update(doc.ref, {
          subscriptions: admin.firestore.FieldValue.arrayRemove(uid),
        }),
      );
      await batch.commit();
    }

    await Promise.all([
      adminFirestore.collection("search_index").doc(`user_${uid}`).delete(),
      adminFirestore.collection("search_index").doc(`channel_${uid}`).delete(),
    ]);

    // Recursive, so `setsPlayed`, `friends`, `ratingHistory` and
    // `bookmarkedQuestions` go with the profile instead of being orphaned
    // under a document that no longer exists.
    await adminFirestore.recursiveDelete(userRef);

    try {
      await adminAuth.deleteUser(uid);
    } catch (err) {
      if ((err as { code?: string })?.code !== "auth/user-not-found") throw err;
    }

    (await cookies()).set("session", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });

    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error(`Failed to delete account ${uid}:`, err);
    return NextResponse.json(
      { error: "Your account could not be deleted. Please try again." },
      { status: 500 },
    );
  }
}
