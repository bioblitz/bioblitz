import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { requireUser, ApiError } from "@/lib/userAccess";
import { LivePacing, normalizePacing, validatePacing } from "@/lib/liveGame";
import { errorBody, liveGameRef, requireHost } from "@/lib/liveGameServer";

export const dynamic = "force-dynamic";

/**
 * Lets the host re-tune pacing. Reveal, leaderboard and reading times can be
 * changed at any point — they only affect screens yet to come. Time per
 * question is locked once the game starts, because it is the budget the set's
 * own time limit was checked against.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ liveGameId: string }> },
) {
  try {
    const { uid } = await requireUser(request);
    const { liveGameId } = await params;

    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Invalid request body.");
    }

    const gameRef = liveGameRef(liveGameId);

    const pacing = await adminFirestore.runTransaction(async (txn) => {
      const snap = await txn.get(gameRef);
      if (!snap.exists) throw new ApiError(404, "That live blitz is gone.");

      const game = snap.data() || {};
      requireHost(game, uid);
      if (game.status === "ended" || game.status === "cancelled") {
        throw new ApiError(409, "This live blitz has finished.");
      }

      const current = game.pacing as LivePacing;
      const inLobby = game.status === "lobby";
      const next = normalizePacing({
        ...current,
        ...body?.pacing,
        // Per-question time is part of the time-limit budget, so it is fixed
        // the moment the first question goes up.
        secondsPerQuestion: inLobby
          ? body?.pacing?.secondsPerQuestion ?? current.secondsPerQuestion
          : current.secondsPerQuestion,
      });

      const errors = validatePacing(
        next,
        Number(game.questionCount) || 0,
        Number(game.timeLimitSeconds) || 0,
      );
      if (errors.length > 0) throw new ApiError(400, errors[0]);

      txn.update(gameRef, { pacing: next });
      return next;
    });

    return NextResponse.json({ pacing });
  } catch (err) {
    const { body, status } = errorBody(err);
    return NextResponse.json(body, { status });
  }
}
