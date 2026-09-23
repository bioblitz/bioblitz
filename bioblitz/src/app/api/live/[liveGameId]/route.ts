import { NextResponse } from "next/server";
import admin from "@/lib/firebase-admin";
import { requireUser, ApiError } from "@/lib/userAccess";
import {
  errorBody,
  liveGameRef,
  releaseJoinCode,
  requireHost,
} from "@/lib/liveGameServer";

export const dynamic = "force-dynamic";

/** Host ends the room early. Answers already recorded are discarded. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ liveGameId: string }> },
) {
  try {
    const { uid } = await requireUser(request);
    const { liveGameId } = await params;

    const gameRef = liveGameRef(liveGameId);
    const snap = await gameRef.get();
    if (!snap.exists) throw new ApiError(404, "That live blitz is gone.");

    const game = snap.data() || {};
    requireHost(game, uid);

    if (game.status !== "ended") {
      await gameRef.update({
        status: "cancelled",
        phase: "final",
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await releaseJoinCode(String(game.joinCode || ""));

    return NextResponse.json({ cancelled: true });
  } catch (err) {
    const { body, status } = errorBody(err);
    return NextResponse.json(body, { status });
  }
}
