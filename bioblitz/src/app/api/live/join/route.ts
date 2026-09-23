import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireUser, ApiError } from "@/lib/userAccess";
import {
  JOIN_CODE_LENGTH,
  LIVE_JOIN_CODES_COLLECTION,
  MAX_LIVE_PLAYERS,
  normalizeJoinCode,
} from "@/lib/liveGame";
import {
  errorBody,
  hasPlayedSet,
  liveGameRef,
  livePlayersRef,
  loadPublicProfile,
} from "@/lib/liveGameServer";

export const dynamic = "force-dynamic";

/**
 * Joins a lobby by code.
 *
 * Anyone can play, but only a first attempt can be rated, so people who have
 * already played the set — and the set's own creator, who can never be rated
 * on their own blitz — join as ghosts: they answer along with the room and
 * see their own score, but they stay out of every ranking and no submission
 * is filed for them. Nobody is turned away, and nobody's existing result is
 * put at risk.
 */
export async function POST(request: Request) {
  try {
    const { uid } = await requireUser(request);

    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new ApiError(400, "Invalid request body.");
    }

    const code = normalizeJoinCode(String(body?.code || ""));
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
    const gameRef = liveGameRef(liveGameId);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      throw new ApiError(404, "No live blitz is using that code.");
    }

    const game = gameSnap.data() || {};
    if (game.status === "cancelled" || game.status === "ended") {
      throw new ApiError(409, "That live blitz has already finished.");
    }
    if (game.status !== "lobby") {
      throw new ApiError(
        409,
        "That live blitz has already started — ask the host for the next one.",
      );
    }
    if (game.hostId === uid) {
      throw new ApiError(409, "You're hosting this one, so you can't also play it.");
    }

    const playerRef = livePlayersRef(liveGameId).doc(uid);
    const existing = await playerRef.get();
    if (existing.exists) {
      return NextResponse.json({
        liveGameId,
        alreadyJoined: true,
        ghost: existing.data()?.ghost === true,
      });
    }

    const isSetCreator = !!game.setCreator && game.setCreator === uid;
    const ghost = isSetCreator || (await hasPlayedSet(uid, String(game.gameId)));

    const profile = await loadPublicProfile(uid);

    await adminFirestore.runTransaction(async (txn) => {
      const fresh = await txn.get(gameRef);
      const freshData = fresh.data() || {};
      if (freshData.status !== "lobby") {
        throw new ApiError(409, "That live blitz has already started.");
      }
      if ((freshData.playerCount || 0) >= MAX_LIVE_PLAYERS) {
        throw new ApiError(
          409,
          `This lobby is full (${MAX_LIVE_PLAYERS} players).`,
        );
      }
      txn.set(playerRef, {
        uid,
        username: profile.username,
        handle: profile.handle,
        photoURL: profile.photoURL,
        bElo: profile.bElo,
        answers: {},
        correctCount: 0,
        totalMs: 0,
        ghost,
        ghostReason: ghost ? (isSetCreator ? "own_blitz" : "already_played") : null,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      txn.update(gameRef, {
        playerCount: admin.firestore.FieldValue.increment(1),
      });
    });

    return NextResponse.json({ liveGameId, alreadyJoined: false, ghost });
  } catch (err) {
    const { body, status } = errorBody(err);
    return NextResponse.json(body, { status });
  }
}
