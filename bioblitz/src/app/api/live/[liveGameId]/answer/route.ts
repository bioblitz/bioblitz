import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { requireUser, ApiError } from "@/lib/userAccess";
import { LiveAnswer, LivePacing, hasSelection } from "@/lib/liveGame";
import { errorBody, liveGameRef, livePlayersRef } from "@/lib/liveGameServer";

export const dynamic = "force-dynamic";

const VALID_KEYS = new Set(["a", "b", "c", "d", "e"]);

function parseChoice(raw: unknown): string | string[] {
  if (Array.isArray(raw)) {
    const keys = raw
      .map((key) => String(key).toLowerCase())
      .filter((key) => VALID_KEYS.has(key));
    return Array.from(new Set(keys)).sort();
  }
  const key = String(raw ?? "").toLowerCase();
  return VALID_KEYS.has(key) ? key : "";
}

/**
 * Records (or changes) a player's answer to the question on screen.
 *
 * The clock is read from the server's own phase start, never from the client,
 * so a player cannot report a faster time than they actually took. The time
 * kept is the moment of the *last* change: players may keep switching until
 * the phase ends, and locking in early is what buys them a better time.
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

    const questionIndex = Number(body?.questionIndex);
    if (!Number.isInteger(questionIndex) || questionIndex < 0) {
      throw new ApiError(400, "Invalid question.");
    }
    const choice = parseChoice(body?.choice);
    const lock = body?.lock === true;

    if (lock && !hasSelection(choice)) {
      throw new ApiError(400, "Pick an answer before locking it in.");
    }

    const gameRef = liveGameRef(liveGameId);
    const playerRef = livePlayersRef(liveGameId).doc(uid);

    const result = await adminFirestore.runTransaction(async (txn) => {
      const [gameSnap, playerSnap] = await Promise.all([
        txn.get(gameRef),
        txn.get(playerRef),
      ]);

      if (!gameSnap.exists) throw new ApiError(404, "That live blitz is gone.");
      if (!playerSnap.exists) {
        throw new ApiError(403, "You're not in this live blitz.");
      }

      const game = gameSnap.data() || {};
      if (game.phase !== "answering") {
        throw new ApiError(409, "Answers are closed for this question.");
      }
      if (Number(game.currentQuestion) !== questionIndex) {
        throw new ApiError(409, "The room has moved on to another question.");
      }

      const answers = (playerSnap.data()?.answers || {}) as Record<
        string,
        LiveAnswer
      >;
      const existing = answers[String(questionIndex)];
      if (existing?.locked) {
        throw new ApiError(409, "You've already locked this answer in.");
      }

      const pacing = game.pacing as LivePacing;
      const startedAt = game.phaseStartedAt?.toMillis?.() ?? Date.now();
      const limitMs = (Number(pacing?.secondsPerQuestion) || 0) * 1000;
      const elapsedMs = Math.min(
        Math.max(0, Date.now() - startedAt),
        limitMs || Number.MAX_SAFE_INTEGER,
      );

      const answer: LiveAnswer = { choice, elapsedMs, locked: lock };
      txn.update(playerRef, { [`answers.${questionIndex}`]: answer });
      return { elapsedMs, locked: lock };
    });

    return NextResponse.json(result);
  } catch (err) {
    const { body, status } = errorBody(err);
    return NextResponse.json(body, { status });
  }
}
