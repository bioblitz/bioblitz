import "server-only";

import admin, { adminFirestore } from "@/lib/firebase-admin";
import { ApiError } from "@/lib/userAccess";
import {
  JOIN_CODE_LENGTH,
  LIVE_GAMES_COLLECTION,
  LIVE_JOIN_CODES_COLLECTION,
  LiveAnswer,
  LivePacing,
  generateJoinCode,
  summarizePlayer,
  toUserAnswers,
} from "@/lib/liveGame";

/** A question as players see it: no correct answer attached. */
export type LiveQuestion = {
  id: string;
  content: string;
  imgURL?: string;
  multipleCorrect?: boolean;
  choices: { key: string; text: string }[];
};

export type LiveSetContent = {
  title: string;
  timeLimitSeconds: number;
  creator: string;
  questions: LiveQuestion[];
  /** Keyed by question index, so select-all arrays stay legal in Firestore. */
  answerKey: Record<string, string | string[]>;
  /**
   * The written explanation for each question, kept next to the answer key
   * rather than with the questions: it usually gives the answer away, so it
   * stays server-side until the host reveals.
   */
  solutions: Record<string, string>;
};

const CHOICE_KEYS = ["a", "b", "c", "d", "e"] as const;

function toChoices(source: Record<string, any>): { key: string; text: string }[] {
  return CHOICE_KEYS.filter((key) => source[key]).map((key) => ({
    key,
    text: String(source[key]),
  }));
}

/**
 * Reads a set into the two halves a live game needs: the public questions the
 * lobby streams to every player, and the answer key kept server-side until the
 * host reveals it.
 *
 * Handles both storage shapes the platform uses — an inline `questions` array
 * on the set, and the `sets/{id}/questions` subcollection — the same way the
 * `getPublicQuestions` Cloud Function does.
 */
export async function loadLiveSetContent(gameId: string): Promise<LiveSetContent> {
  const setRef = adminFirestore.collection("sets").doc(gameId);
  const setSnap = await setRef.get();
  if (!setSnap.exists) {
    throw new ApiError(404, "That blitz no longer exists.");
  }

  const setData = setSnap.data() || {};
  const title = String(setData.title || setData.name || "Untitled Blitz");
  const timeLimitSeconds = Number(setData.timeLimit) || 0;
  const creator = String(setData.creator || "");

  const questions: LiveQuestion[] = [];
  const answerKey: Record<string, string | string[]> = {};
  const solutions: Record<string, string> = {};

  if (Array.isArray(setData.questions) && setData.questions.length > 0) {
    setData.questions.forEach((raw: any, index: number) => {
      const lettered: Record<string, any> = {};
      if (Array.isArray(raw.answers)) {
        raw.answers.forEach((answer: string, i: number) => {
          if (i < CHOICE_KEYS.length) lettered[CHOICE_KEYS[i]] = answer;
        });
      } else {
        CHOICE_KEYS.forEach((key) => {
          if (raw[key]) lettered[key] = raw[key];
        });
      }

      const correct = raw.correctAnswer ?? "";
      const question: LiveQuestion = {
        id: String(raw.id || index),
        content: String(raw.question || raw.content || ""),
        choices: toChoices(lettered),
      };
      const image = raw.imgURL || raw.imageUrl;
      if (image) question.imgURL = String(image);
      if (Array.isArray(correct)) question.multipleCorrect = true;

      questions.push(question);
      answerKey[String(index)] = correct;
      const solution = String(raw.solution || raw.explanation || "").trim();
      if (solution) solutions[String(index)] = solution;
    });
  } else {
    const questionsSnap = await setRef.collection("questions").get();
    questionsSnap.docs.forEach((doc, index) => {
      const raw = doc.data() || {};
      const correct = raw.correct ?? "";
      const question: LiveQuestion = {
        id: doc.id,
        content: String(raw.content || ""),
        choices: toChoices(raw),
      };
      if (raw.imgURL) question.imgURL = String(raw.imgURL);
      if (Array.isArray(correct) || raw.multipleCorrect === true) {
        question.multipleCorrect = true;
      }

      questions.push(question);
      answerKey[String(index)] = correct;
      const solution = String(raw.solution || raw.explanation || "").trim();
      if (solution) solutions[String(index)] = solution;
    });
  }

  return { title, timeLimitSeconds, creator, questions, answerKey, solutions };
}

/**
 * Has this user already played the set? Live blitzes are first-attempt only,
 * so that every run counts for Elo the way a normal ranked attempt does.
 *
 * Checks both markers `gradeTest` writes: the `setsPlayed` doc (which it uses
 * as its own replay check) and the `playedGameIds` array (written on every
 * first attempt, ranked or not).
 */
export async function hasPlayedSet(uid: string, gameId: string): Promise<boolean> {
  const [historySnap, userSnap] = await Promise.all([
    adminFirestore
      .collection("users")
      .doc(uid)
      .collection("setsPlayed")
      .doc(gameId)
      .get(),
    adminFirestore.collection("users").doc(uid).get(),
  ]);

  if (historySnap.exists) return true;
  const played = userSnap.data()?.playedGameIds;
  return Array.isArray(played) && played.includes(gameId);
}

export type PublicProfile = {
  username: string;
  handle: string;
  photoURL: string;
  bElo: number;
};

export async function loadPublicProfile(uid: string): Promise<PublicProfile> {
  const snap = await adminFirestore.collection("users").doc(uid).get();
  const data = (snap.data() || {}) as Record<string, any>;
  return {
    username: String(data.username || data.displayName || "Player"),
    handle: String(data.username || ""),
    photoURL: String(data.photoURL || ""),
    bElo: Number(data.bElo) || 500,
  };
}

/**
 * Claims a join code for a live game. The code doc doubles as the lookup
 * players hit when joining, and creating it inside a transaction is what makes
 * the code unique even when two hosts start at the same instant.
 */
export async function allocateJoinCode(liveGameId: string): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateJoinCode();
    const codeRef = adminFirestore
      .collection(LIVE_JOIN_CODES_COLLECTION)
      .doc(code);

    const claimed = await adminFirestore.runTransaction(async (txn) => {
      const existing = await txn.get(codeRef);
      if (existing.exists) return false;
      txn.set(codeRef, {
        liveGameId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    });

    if (claimed) return code;
  }
  throw new ApiError(503, "Could not generate a join code — try again.");
}

export async function releaseJoinCode(code: string): Promise<void> {
  if (!code || code.length !== JOIN_CODE_LENGTH) return;
  try {
    await adminFirestore
      .collection(LIVE_JOIN_CODES_COLLECTION)
      .doc(code)
      .delete();
  } catch {
    // A stale code doc is harmless; never fail the caller over it.
  }
}

export function liveGameRef(liveGameId: string) {
  return adminFirestore.collection(LIVE_GAMES_COLLECTION).doc(liveGameId);
}

export function livePlayersRef(liveGameId: string) {
  return liveGameRef(liveGameId).collection("players");
}

/** Public questions live here; the answer key sits next to them, read-denied. */
export function liveContentRef(liveGameId: string, docId: "questions" | "answers") {
  return liveGameRef(liveGameId).collection("content").doc(docId);
}

export type LiveGameDoc = {
  gameId: string;
  gameTitle: string;
  hostId: string;
  status: string;
  phase: string;
  phaseSeq: number;
  currentQuestion: number;
  questionCount: number;
  timeLimitSeconds: number;
  pacing: LivePacing;
  joinCode: string;
  submissionsCreated?: boolean;
};

export async function requireLiveGame(liveGameId: string) {
  const snap = await liveGameRef(liveGameId).get();
  if (!snap.exists) {
    throw new ApiError(404, "That live blitz no longer exists.");
  }
  return snap;
}

export function requireHost(data: Record<string, any>, uid: string) {
  if (data.hostId !== uid) {
    throw new ApiError(403, "Only the host can do that.");
  }
}

/** Turns an ApiError (or anything else) into the JSON body + status to return. */
export function errorBody(err: unknown): { body: { error: string }; status: number } {
  if (err instanceof ApiError) {
    return { body: { error: err.message }, status: err.status };
  }
  console.error("Live blitz request failed:", err);
  return { body: { error: "Something went wrong." }, status: 500 };
}

/**
 * Writes every live player's run into `gameSubmissions` as a normal ranked
 * first attempt. Nothing about live scoring is special-cased downstream: the
 * `gradeTest` Cloud Function grades these, records `setsPlayed`, bumps the
 * set's play counts and applies Elo exactly as it does for a solo attempt.
 *
 * Two kinds of player are skipped. Ghosts, because their rated attempt at this
 * set already happened and a second one would only be graded as a replay. And
 * anyone who never answered a single question, because a no-show shouldn't
 * cost them a rated attempt at a set they never really played.
 *
 * Returns the number of submissions created. Safe to call twice: the first
 * call claims the game, and a `${uid}_${gameId}` collision (someone finished
 * the set solo mid-game) is skipped rather than overwritten.
 */
export async function createLiveSubmissions(liveGameId: string): Promise<number> {
  const gameRef = liveGameRef(liveGameId);

  const claimed = await adminFirestore.runTransaction(async (txn) => {
    const snap = await txn.get(gameRef);
    if (!snap.exists) return false;
    if (snap.data()?.submissionsCreated === true) return false;
    txn.update(gameRef, {
      submissionsCreated: true,
      submissionsStartedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  });
  if (!claimed) return 0;

  const gameSnap = await gameRef.get();
  const game = gameSnap.data() || {};
  const gameId = String(game.gameId || "");
  const questionCount = Number(game.questionCount) || 0;
  const secondsPerQuestion = Number(game.pacing?.secondsPerQuestion) || 0;

  const playersSnap = await livePlayersRef(liveGameId).get();
  let created = 0;

  for (const playerDoc of playersSnap.docs) {
    const player = playerDoc.data() || {};
    if (player.ghost === true) continue;

    const answers = (player.answers || {}) as Record<string, LiveAnswer>;
    const userAnswers = toUserAnswers(answers, questionCount);
    if (Object.keys(userAnswers).length === 0) continue;

    const { totalMs, questionTimings } = summarizePlayer(
      answers,
      questionCount,
      secondsPerQuestion,
    );

    const submissionRef = adminFirestore
      .collection("gameSubmissions")
      .doc(`${playerDoc.id}_${gameId}`);

    try {
      await submissionRef.create({
        gameId,
        userId: playerDoc.id,
        userAnswers,
        timeTaken: Math.round(totalMs / 1000),
        timeTakenMs: totalMs,
        questionTimings,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "pending_grading",
        username: player.username || "Unknown",
        handle: player.handle || "",
        photoURL: player.photoURL || "",
        tabSwitchCount: 0,
        timeOffTab: 0,
        ranked: true,
        live: true,
        liveGameId,
        liveJoinCode: String(game.joinCode || ""),
      });
      created += 1;
      await playerDoc.ref.update({ submissionId: submissionRef.id });
    } catch (err: any) {
      // ALREADY_EXISTS means they finished this set another way mid-game; that
      // attempt is the real one, so leave it alone.
      if (err?.code === 6) {
        await playerDoc.ref.update({ submissionSkipped: "already_attempted" });
        continue;
      }
      console.error(
        `Failed to record live submission for ${playerDoc.id} in ${liveGameId}:`,
        err,
      );
      await playerDoc.ref.update({ submissionSkipped: "error" });
    }
  }

  await gameRef.update({
    submissionCount: created,
    submissionsFinishedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return created;
}
