import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireUser, ApiError } from "@/lib/userAccess";
import {
  LiveAnswer,
  LivePacing,
  LivePhase,
  hasSelection,
  isAnswerCorrect,
  nextPhase,
  phaseDurationSeconds,
  summarizePlayer,
} from "@/lib/liveGame";
import {
  createLiveSubmissions,
  errorBody,
  liveContentRef,
  liveGameRef,
  livePlayersRef,
  releaseJoinCode,
  requireHost,
} from "@/lib/liveGameServer";

export const dynamic = "force-dynamic";

/**
 * Grades the question that just closed.
 *
 * Runs after the phase has already flipped, so answers are shut and the
 * player docs are no longer being written to — grading a room of a hundred
 * inside the phase transaction would have every one of those answer writes
 * contending with it.
 *
 * Each player's totals are rewritten from their own answer history rather than
 * incremented, which makes this safe to re-run: a retry recomputes the same
 * numbers instead of double-counting.
 */
async function gradeQuestion(
  liveGameId: string,
  questionIndex: number,
  correct: string | string[],
  pacing: LivePacing,
): Promise<void> {
  const playersSnap = await livePlayersRef(liveGameId).get();
  const key = String(questionIndex);
  const missMs = (Number(pacing?.secondsPerQuestion) || 0) * 1000;

  for (let i = 0; i < playersSnap.docs.length; i += 400) {
    const batch = adminFirestore.batch();

    playersSnap.docs.slice(i, i + 400).forEach((playerDoc) => {
      const answers = (playerDoc.data()?.answers || {}) as Record<
        string,
        LiveAnswer
      >;
      const answer = answers[key];
      const answered = !!answer && hasSelection(answer.choice);

      const graded: LiveAnswer = {
        choice: answered ? answer.choice : "",
        elapsedMs: answered ? Number(answer.elapsedMs) || 0 : missMs,
        locked: true,
        correct: answered && isAnswerCorrect(answer.choice, correct),
      };

      const totals = summarizePlayer(
        { ...answers, [key]: graded },
        questionIndex + 1,
        pacing.secondsPerQuestion,
      );

      batch.update(playerDoc.ref, {
        [`answers.${key}`]: graded,
        correctCount: totals.correctCount,
        totalMs: totals.totalMs,
      });
    });

    await batch.commit();
  }
}

/**
 * Moves the game to its next phase. The host screen calls this both when a
 * phase's clock runs out and when the host clicks to skip ahead, so it has to
 * be safe to call twice at once: `fromSeq` pins the transition to the state
 * the caller actually saw, and a stale call is reported as skipped rather than
 * double-advancing the room.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ liveGameId: string }> },
) {
  try {
    const { uid } = await requireUser(request);
    const { liveGameId } = await params;

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const fromSeq = Number.isFinite(Number(body?.fromSeq))
      ? Number(body.fromSeq)
      : null;

    const gameRef = liveGameRef(liveGameId);

    // The answer key never changes after the room is created, so reading it up
    // front costs nothing and keeps it out of the transaction.
    const answersSnap = await liveContentRef(liveGameId, "answers").get();
    const answerKey = (answersSnap.data()?.answerKey || {}) as Record<
      string,
      string | string[]
    >;
    const solutions = (answersSnap.data()?.solutions || {}) as Record<
      string,
      string
    >;

    const outcome = await adminFirestore.runTransaction(async (txn) => {
      const gameSnap = await txn.get(gameRef);
      if (!gameSnap.exists) throw new ApiError(404, "That live blitz is gone.");

      const game = gameSnap.data() || {};
      requireHost(game, uid);

      if (game.status === "cancelled") {
        throw new ApiError(409, "This live blitz was cancelled.");
      }

      const phase = String(game.phase) as LivePhase;
      const currentQuestion = Number(game.currentQuestion) || 0;
      const questionCount = Number(game.questionCount) || 0;
      const pacing = game.pacing as LivePacing;
      const phaseSeq = Number(game.phaseSeq) || 0;

      if (fromSeq !== null && fromSeq !== phaseSeq) {
        return { skipped: true as const, phaseSeq };
      }

      const target = nextPhase(phase, currentQuestion, questionCount);
      if (!target) {
        throw new ApiError(409, "This live blitz has already finished.");
      }

      if (phase === "lobby" && (Number(game.playerCount) || 0) === 0) {
        throw new ApiError(409, "Wait for at least one player to join.");
      }

      const now = Date.now();
      const duration = phaseDurationSeconds(target.phase, pacing);

      const gameUpdate: Record<string, any> = {
        phase: target.phase,
        currentQuestion: target.questionIndex,
        phaseSeq: phaseSeq + 1,
        phaseStartedAt: admin.firestore.Timestamp.fromMillis(now),
        phaseEndsAt:
          duration === null
            ? null
            : admin.firestore.Timestamp.fromMillis(now + duration * 1000),
      };

      if (phase === "lobby") {
        gameUpdate.status = "running";
        gameUpdate.startedAt = admin.firestore.Timestamp.fromMillis(now);
      }

      // Publishing the correct answer is part of closing the question, so the
      // reveal is never on screen without it. The written explanation rides
      // along: it is part of the same disclosure and would be pointless a
      // moment later, once the room has moved on.
      const grading = phase === "answering";
      if (grading) {
        gameUpdate[`revealed.${currentQuestion}`] =
          answerKey[String(currentQuestion)] ?? "";
        const solution = solutions[String(currentQuestion)];
        if (solution) {
          gameUpdate[`revealedSolutions.${currentQuestion}`] = solution;
        }
      }

      if (target.phase === "final") {
        gameUpdate.status = "ended";
        gameUpdate.endedAt = admin.firestore.Timestamp.fromMillis(now);
      }

      txn.update(gameRef, gameUpdate);

      return {
        skipped: false as const,
        phase: target.phase,
        questionIndex: target.questionIndex,
        phaseSeq: phaseSeq + 1,
        finished: target.phase === "final",
        grading,
        gradedQuestion: currentQuestion,
        pacing,
        joinCode: String(game.joinCode || ""),
      };
    });

    if (outcome.skipped) {
      return NextResponse.json({ skipped: true, phaseSeq: outcome.phaseSeq });
    }

    if (outcome.grading) {
      await gradeQuestion(
        liveGameId,
        outcome.gradedQuestion,
        answerKey[String(outcome.gradedQuestion)] ?? "",
        outcome.pacing,
      );
    }

    // The game is over: hand every run to the normal grading pipeline and free
    // the join code for reuse.
    if (outcome.finished) {
      const submissions = await createLiveSubmissions(liveGameId);
      await releaseJoinCode(outcome.joinCode);
      return NextResponse.json({ ...outcome, submissions });
    }

    return NextResponse.json(outcome);
  } catch (err) {
    const { body, status } = errorBody(err);
    return NextResponse.json(body, { status });
  }
}
