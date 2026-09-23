import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { ApiError } from "@/lib/userAccess";
import {
  JOIN_CODE_LENGTH,
  LIVE_JOIN_CODES_COLLECTION,
  MAX_LIVE_PLAYERS,
  normalizeJoinCode,
} from "@/lib/liveGame";
import { errorBody, liveGameRef } from "@/lib/liveGameServer";

export const dynamic = "force-dynamic";

/**
 * Public details for a room, looked up by join code.
 *
 * Deliberately unauthenticated: this is what backs the shareable
 * `/live/<code>` link, so someone who is not signed in yet has to be able to
 * see what they are about to join before they decide to sign in for it.
 *
 * It returns only what a poster on a wall would already say — the blitz's
 * title, who is hosting, how many people are in, whether it is still open.
 * Nothing about the questions, and nothing about who the other players are.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code: raw } = await params;
    const code = normalizeJoinCode(decodeURIComponent(raw || ""));
    if (code.length !== JOIN_CODE_LENGTH) {
      throw new ApiError(400, `A join code is ${JOIN_CODE_LENGTH} characters.`);
    }

    const codeSnap = await adminFirestore
      .collection(LIVE_JOIN_CODES_COLLECTION)
      .doc(code)
      .get();
    if (!codeSnap.exists) {
      throw new ApiError(404, "No live blitz is using that code.");
    }

    const liveGameId = String(codeSnap.data()?.liveGameId || "");
    const gameSnap = await liveGameRef(liveGameId).get();
    if (!gameSnap.exists) {
      throw new ApiError(404, "No live blitz is using that code.");
    }

    const game = gameSnap.data() || {};
    const status = String(game.status || "lobby");
    const playerCount = Number(game.playerCount) || 0;

    // Mirrors the checks in the join route, so the page can explain why it is
    // not offering a way in rather than letting someone sign in for nothing.
    let closedReason: string | null = null;
    if (status === "cancelled" || status === "ended") {
      closedReason = "That live blitz has already finished.";
    } else if (status !== "lobby") {
      closedReason =
        "That live blitz has already started — ask the host for the next one.";
    } else if (playerCount >= MAX_LIVE_PLAYERS) {
      closedReason = `This lobby is full (${MAX_LIVE_PLAYERS} players).`;
    }

    return NextResponse.json({
      code,
      liveGameId,
      gameId: String(game.gameId || ""),
      gameTitle: String(game.gameTitle || "Untitled Blitz"),
      hostUsername: String(game.hostUsername || ""),
      hostPhotoURL: String(game.hostPhotoURL || ""),
      questionCount: Number(game.questionCount) || 0,
      secondsPerQuestion: Number(game.pacing?.secondsPerQuestion) || 0,
      status,
      playerCount,
      open: closedReason === null,
      closedReason,
    });
  } catch (err) {
    const { body, status } = errorBody(err);
    return NextResponse.json(body, { status });
  }
}
