import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireUser, ApiError } from "@/lib/userAccess";
import { errorBody, liveGameRef, livePlayersRef } from "@/lib/liveGameServer";

export const dynamic = "force-dynamic";

/**
 * Leaves a lobby before it starts. Once the first question is up a player is
 * in for the whole run — their answers are already part of the standings and
 * of the submission waiting to be written at the end.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ liveGameId: string }> },
) {
  try {
    const { uid } = await requireUser(request);
    const { liveGameId } = await params;

    const gameRef = liveGameRef(liveGameId);
    const playerRef = livePlayersRef(liveGameId).doc(uid);

    await adminFirestore.runTransaction(async (txn) => {
      const [gameSnap, playerSnap] = await Promise.all([
        txn.get(gameRef),
        txn.get(playerRef),
      ]);
      if (!playerSnap.exists) return;
      if (gameSnap.data()?.status !== "lobby") {
        throw new ApiError(409, "The blitz has already started.");
      }
      txn.delete(playerRef);
      txn.update(gameRef, {
        playerCount: admin.firestore.FieldValue.increment(-1),
      });
    });

    return NextResponse.json({ left: true });
  } catch (err) {
    const { body, status } = errorBody(err);
    return NextResponse.json(body, { status });
  }
}
