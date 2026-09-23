import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireUser, ApiError } from "@/lib/userAccess";
import {
  LIVE_GAMES_COLLECTION,
  MAX_LIVE_QUESTIONS,
  normalizePacing,
  validatePacing,
} from "@/lib/liveGame";
import {
  allocateJoinCode,
  errorBody,
  liveContentRef,
  loadLiveSetContent,
  loadPublicProfile,
  releaseJoinCode,
} from "@/lib/liveGameServer";

export const dynamic = "force-dynamic";

/**
 * Opens a live blitz: locks in the host's pacing, snapshots the set's
 * questions, and hands back a join code for the room.
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

    const gameId = String(body?.gameId || "").trim();
    if (!gameId) throw new ApiError(400, "Pick a blitz to host.");

    const content = await loadLiveSetContent(gameId);
    if (content.questions.length === 0) {
      throw new ApiError(400, "That blitz has no questions to host.");
    }
    if (content.questions.length > MAX_LIVE_QUESTIONS) {
      throw new ApiError(
        400,
        `Live blitzes are capped at ${MAX_LIVE_QUESTIONS} questions.`,
      );
    }

    const pacing = normalizePacing(body?.pacing);
    const errors = validatePacing(
      pacing,
      content.questions.length,
      content.timeLimitSeconds,
    );
    if (errors.length > 0) throw new ApiError(400, errors[0]);

    const host = await loadPublicProfile(uid);

    // One live blitz per host at a time — an abandoned lobby would otherwise
    // keep answering to a code the host has forgotten about. Filtered in code
    // rather than with a second `where`, so this needs no composite index.
    const hosted = await adminFirestore
      .collection(LIVE_GAMES_COLLECTION)
      .where("hostId", "==", uid)
      .get();
    await Promise.all(
      hosted.docs
        .filter((doc) => ["lobby", "running"].includes(String(doc.data().status)))
        .map(async (doc) => {
          await doc.ref.update({
            status: "cancelled",
            endedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          await releaseJoinCode(String(doc.data().joinCode || ""));
        }),
    );

    const gameRef = adminFirestore.collection(LIVE_GAMES_COLLECTION).doc();
    const joinCode = await allocateJoinCode(gameRef.id);

    try {
      const batch = adminFirestore.batch();
      batch.set(gameRef, {
        gameId,
        gameTitle: content.title,
        hostId: uid,
        hostUsername: host.username,
        hostPhotoURL: host.photoURL,
        joinCode,
        status: "lobby",
        phase: "lobby",
        phaseSeq: 0,
        currentQuestion: 0,
        questionCount: content.questions.length,
        timeLimitSeconds: content.timeLimitSeconds,
        setCreator: content.creator,
        pacing,
        revealed: {},
        playerCount: 0,
        submissionsCreated: false,
        phaseStartedAt: null,
        phaseEndsAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        startedAt: null,
        endedAt: null,
      });
      batch.set(liveContentRef(gameRef.id, "questions"), {
        questions: content.questions,
      });
      batch.set(liveContentRef(gameRef.id, "answers"), {
        answerKey: content.answerKey,
        solutions: content.solutions,
      });
      await batch.commit();
    } catch (err) {
      await releaseJoinCode(joinCode);
      throw err;
    }

    return NextResponse.json({
      liveGameId: gameRef.id,
      joinCode,
      questionCount: content.questions.length,
    });
  } catch (err) {
    const { body, status } = errorBody(err);
    return NextResponse.json(body, { status });
  }
}
