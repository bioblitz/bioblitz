import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const gameId = String(body?.gameId || "").trim();
  const gameTitle = String(body?.gameTitle || "").trim();

  if (!gameId || !gameTitle) {
    return NextResponse.json(
      { error: "Missing gameId or gameTitle" },
      { status: 400 },
    );
  }

  const creatorUid = decoded.uid;

  try {
    const creatorDoc = await adminFirestore
      .collection("users")
      .doc(creatorUid)
      .get();
    const creatorData = creatorDoc.data();
    const creatorName =
      creatorData?.displayName || creatorData?.username || "Someone";
    const creatorPhoto = creatorData?.photoURL || "";
    const creatorUsername = creatorData?.username || "";

    const subscribersSnap = await adminFirestore
      .collection("users")
      .where("subscriptions", "array-contains", creatorUid)
      .get();

    if (subscribersSnap.empty) {
      return NextResponse.json({
        message: "No subscribers to notify.",
        count: 0,
      });
    }

    const subscribers = subscribersSnap.docs;
    for (let i = 0; i < subscribers.length; i += 400) {
      const chunk = subscribers.slice(i, i + 400);
      const batch = adminFirestore.batch();

      for (const subDoc of chunk) {
        if (subDoc.id === creatorUid) continue;

        const notifRef = adminFirestore.collection("notifications").doc();
        batch.set(notifRef, {
          recipientUid: subDoc.id,
          title: `${creatorName} published a new Blitz!`,
          message: gameTitle,
          link: `/home/${gameId}`,
          read: false,
          senderPhotoURL: creatorPhoto,
          createdAt: FieldValue.serverTimestamp(),
          type: "new_blitz",
        });
      }

      await batch.commit();
    }

    return NextResponse.json({
      message: "Subscribers notified.",
      count: subscribers.length,
    });
  } catch (err: any) {
    console.error("Error notifying subscribers:", err);
    return NextResponse.json(
      { error: "Failed to notify subscribers." },
      { status: 500 },
    );
  }
}
