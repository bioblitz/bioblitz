import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentWritten,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

admin.initializeApp();
const db = admin.firestore();

function computeExpectedPercentile(Rp: number, Rc: number): number {
  const logistic = 1 / (1 + Math.pow(10, (Rc - Rp) / 400));
  // Rating-dependent downward shift so lower-rated players need a lower percentile to gain.
  // At par (500) break-even ≈ 20th percentile; at 1000 ≈ 40th; above 1500 ≈ standard 50th.
  const shift = 0.3 * Math.exp(-0.0022 * (Rp - 500));
  return Math.max(0, Math.min(1, logistic - shift));
}

function computeKFactor(Rp: number, Rc: number): number {
  return 50 * Math.exp(-(Rp - Rc) / 1000);
}

function computeExperienceMultiplier(n: number): number {
  if (n < 25) return 1 + 4 * Math.pow(1 - n / 25, 2);
  return 1.0;
}

function computeInactivityMultiplier(lastContestAt: Date | null): number {
  if (!lastContestAt) return 1.0;
  const daysSince =
    (Date.now() - lastContestAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(1.0 + 0.01 * daysSince, 2.0);
}

function applyIntegerRounding(deltaRaw: number): number {
  if (deltaRaw > 0 && deltaRaw < 1) return Math.ceil(deltaRaw);
  if (deltaRaw < 0 && deltaRaw > -1) return Math.floor(deltaRaw);
  return Math.round(deltaRaw);
}

function computeFinalDelta(
  Rp: number,
  Rc: number,
  pi: number,
  piHat: number,
  Kp: number,
  contestsPlayed: number,
  lastContestAt: Date | null,
  isEarlyEntry: boolean,
  isFirst: boolean,
): number {
  const piHatShifted = piHat * (1 - Math.exp(-Rp / 1000));
  const deltaBase = Kp * (pi - piHatShifted);
  const deltaFloor = Math.max(0, (Rc - Rp) / 10000);

  const Mexp = computeExperienceMultiplier(contestsPlayed);
  const Minact = computeInactivityMultiplier(lastContestAt);
  const Mearly = isEarlyEntry ? 2.0 : 1.0;

  let deltaRaw = deltaBase * Mexp * Minact * Mearly + deltaFloor;

  if (isFirst) deltaRaw = Math.max(deltaRaw, 0);

  return applyIntegerRounding(deltaRaw);
}

interface ParticipantEntry {
  submissionId: string;
  userId: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  eloAtSubmission?: number;
}

async function activateContest(
  gameId: string,
  setTitle: string,
  currentSub: ParticipantEntry,
): Promise<void> {
  const submissionsSnap = await db
    .collection("gameSubmissions")
    .where("gameId", "==", gameId)
    .get();

  const submissions: ParticipantEntry[] = submissionsSnap.docs
    .filter((doc) => doc.data().isFirstAttempt === true)
    .map((doc) => ({
      submissionId: doc.id,
      userId: doc.data().userId,
      score: doc.data().score ?? 0,
      correctCount: doc.data().correctCount ?? 0,
      totalQuestions: doc.data().totalQuestions ?? 1,
      eloAtSubmission: doc.data().eloAtSubmission,
    }));

  if (!submissions.find((s) => s.submissionId === currentSub.submissionId)) {
    submissions.push(currentSub);
  }

  const P = submissions.length;
  if (P === 0) return;

  const userIds = [...new Set(submissions.map((s) => s.userId))];
  const userDocs = await Promise.all(
    userIds.map((uid) => db.collection("users").doc(uid).get()),
  );

  const userMap: Record<
    string,
    { bElo: number; contestsPlayed: number; lastContestAt: Date | null }
  > = {};
  userDocs.forEach((doc) => {
    if (doc.exists) {
      const d = doc.data()!;
      userMap[doc.id] = {
        bElo: d.bElo ?? 500,
        contestsPlayed: d.contestsPlayed ?? 0,
        lastContestAt: d.lastContestAt?.toDate() ?? null,
      };
    }
  });

  const Rbar =
    submissions.reduce(
      (sum, s) => sum + (s.eloAtSubmission ?? userMap[s.userId]?.bElo ?? 500),
      0,
    ) / P;
  const sbar =
    submissions.reduce(
      (sum, s) => sum + s.correctCount / Math.max(s.totalQuestions, 1),
      0,
    ) / P;
  const delta = Math.max(0.01, Math.min(1.0, sbar));
  const Rc = Rbar * delta;

  const sorted = [...submissions].sort((a, b) => b.score - a.score);
  const rankMap: Record<string, number> = {};
  sorted.forEach((s, idx) => {
    rankMap[s.submissionId] = idx + 1;
  });

  const piMap: Record<string, number> = {};
  submissions.forEach((s) => {
    const rankI = rankMap[s.submissionId];
    const beaten = sorted.filter((_, idx) => idx + 1 > rankI).length;
    piMap[s.submissionId] = P > 1 ? beaten / (P - 1) : 1.0;
  });

  const BATCH_SIZE = 499;
  let currentBatch = db.batch();
  let ops = 0;
  const batches: FirebaseFirestore.WriteBatch[] = [];

  const flush = (force = false) => {
    if (ops >= BATCH_SIZE || (force && ops > 0)) {
      batches.push(currentBatch);
      currentBatch = db.batch();
      ops = 0;
    }
  };

  for (const sub of submissions) {
    const user = userMap[sub.userId];
    if (!user) continue;

    const Rp = sub.eloAtSubmission ?? user.bElo;
    const piHat = computeExpectedPercentile(Rp, Rc);
    const Kp = computeKFactor(Rp, Rc);
    const pi = piMap[sub.submissionId];
    const isFirst = rankMap[sub.submissionId] === 1;

    const deltaFinal = computeFinalDelta(
      Rp,
      Rc,
      pi,
      piHat,
      Kp,
      user.contestsPlayed,
      user.lastContestAt,
      true,
      isFirst,
    );
    const newElo = Rp + deltaFinal;

    const userRef = db.collection("users").doc(sub.userId);
    currentBatch.update(userRef, {
      bElo: newElo,
      contestsPlayed: FieldValue.increment(1),
      lastContestAt: FieldValue.serverTimestamp(),
    });
    ops++;
    flush();

    const historyRef = userRef.collection("ratingHistory").doc();
    currentBatch.set(historyRef, {
      newElo,
      delta: deltaFinal,
      contestId: gameId,
      timestamp: FieldValue.serverTimestamp(),
    });
    ops++;
    flush();

    const submissionRef = db
      .collection("gameSubmissions")
      .doc(sub.submissionId);
    currentBatch.update(submissionRef, { 
      ratingDelta: deltaFinal, 
      newElo,
      rank: rankMap[sub.submissionId]
    });
    ops++;
    flush();

    const sign = deltaFinal >= 0 ? "+" : "";
    const notifRef = db.collection("notifications").doc();
    currentBatch.set(notifRef, {
      recipientUid: sub.userId,
      type: "system",
      title: "Early entry bonus applied! 🥳",
      message: `"${setTitle}" just hit 25 players. Your rating changed by (${sign}${deltaFinal}) elo!`,
      link: `/home/${gameId}`,
      senderUid: null,
      senderPhotoURL:
        "https://firebasestorage.googleapis.com/v0/b/bioblitz-mitosisphere.firebasestorage.app/o/favicon.ico?alt=media&token=e2adaeaf-580e-4aac-9aae-9596c13924df",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    ops++;
    flush();
  }

  const setRef = db.collection("sets").doc(gameId);
  currentBatch.update(setRef, { contestRating: Rc });
  ops++;
  flush(true);

  await Promise.all(batches.map((b) => b.commit()));

  console.log(
    `Contest ${gameId} activated: Rc=${Rc.toFixed(1)}, δ=${delta.toFixed(3)}, ${submissions.length} participants rated.`,
  );
}

async function rateParticipant(
  userId: string,
  submissionId: string,
  gameId: string,
  score: number,
): Promise<void> {
  const submissionsSnap = await db
    .collection("gameSubmissions")
    .where("gameId", "==", gameId)
    .get();

  const submissions = submissionsSnap.docs
    .filter((doc) => doc.data().isFirstAttempt === true)
    .map((doc) => ({
      submissionId: doc.id,
      userId: doc.data().userId,
      score: doc.data().score ?? 0,
    }));

  if (!submissions.find((s) => s.submissionId === submissionId)) {
    submissions.push({ submissionId, userId, score });
  }

  const P = submissions.length;

  const setDoc = await db.collection("sets").doc(gameId).get();
  let Rc = setDoc.data()?.contestRating as number | undefined;

  if (typeof Rc !== "number") {
    const userIds = [...new Set(submissions.map((s) => s.userId))];
    const userDocs = await Promise.all(
      userIds.map((uid) => db.collection("users").doc(uid).get()),
    );
    const ratingSum = userDocs.reduce(
      (sum, d) => sum + (d.exists ? (d.data()!.bElo ?? 500) : 500),
      0,
    );
    const Rbar = ratingSum / userIds.length;
    Rc = Rbar * 0.5;
    console.warn(
      `contestRating missing for ${gameId}, using fallback Rc=${Rc.toFixed(1)}`,
    );
  }

  const sorted = [...submissions].sort((a, b) => b.score - a.score);
  const myIdx = sorted.findIndex((s) => s.submissionId === submissionId);
  const myRank = myIdx + 1;
  const beaten = sorted.filter((_, idx) => idx + 1 > myRank).length;
  const pi = P > 1 ? beaten / (P - 1) : 1.0;
  const isFirst = myRank === 1;

  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();
  const Rp = userData?.bElo ?? 500;
  const n = userData?.contestsPlayed ?? 0;
  const lastContestAt: Date | null = userData?.lastContestAt?.toDate() ?? null;

  const piHat = computeExpectedPercentile(Rp, Rc);
  const Kp = computeKFactor(Rp, Rc);
  const deltaFinal = computeFinalDelta(
    Rp,
    Rc,
    pi,
    piHat,
    Kp,
    n,
    lastContestAt,
    false,
    isFirst,
  );
  const newElo = Rp + deltaFinal;

  const userRef = db.collection("users").doc(userId);
  const historyRef = userRef.collection("ratingHistory").doc();

  const submissionRef = db.collection("gameSubmissions").doc(submissionId);
  await Promise.all([
    userRef.update({
      bElo: newElo,
      contestsPlayed: FieldValue.increment(1),
      lastContestAt: FieldValue.serverTimestamp(),
    }),
    historyRef.set({
      newElo,
      delta: deltaFinal,
      contestId: gameId,
      timestamp: FieldValue.serverTimestamp(),
    }),
    submissionRef.update({ ratingDelta: deltaFinal, newElo }),
  ]);

  const sign = deltaFinal >= 0 ? "+" : "";
  console.log(
    `Rated ${userId} in contest ${gameId}: rank ${myRank}/${P}, Rp=${Rp} → ${newElo} (${sign}${deltaFinal})`,
  );
}

export const gradeTest = onDocumentCreated(
  "gameSubmissions/{submissionId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event.");
      return;
    }

    try {
      const submissionData = snap.data();
      if (
        !submissionData?.gameId ||
        !submissionData.userAnswers ||
        typeof submissionData.timeTaken !== "number" ||
        !submissionData.userId
      ) {
        console.error("Submission document is malformed:", snap.id);
        return snap.ref.update({ status: "error_malformed_submission" });
      }

      const { gameId, userId, userAnswers, timeTaken } = submissionData;

      const gameDocRef = db.collection("sets").doc(gameId);
      const gameDoc = await gameDocRef.get();

      if (!gameDoc.exists) {
        console.error("Game set not found:", gameId);
        return snap.ref.update({ status: "error_game_not_found" });
      }

      const gameTitle =
        gameDoc.data()?.title || gameDoc.data()?.name || "Untitled Set";
      const timeTotal = gameDoc.data()?.timeLimit as number;
      const gameData = gameDoc.data();

      let totalQuestions = 0;
      const correctAnswersMap: { [key: number]: string } = {};

      if (
        gameData?.questions &&
        Array.isArray(gameData.questions) &&
        gameData.questions.length > 0
      ) {
        totalQuestions = gameData.questions.length;
        gameData.questions.forEach((q: any, index: number) => {
          correctAnswersMap[index] = q.correctAnswer || "";
        });
      } else {
        const questionsColRef = gameDocRef.collection("questions");
        const questionsSnap = await questionsColRef.get();
        totalQuestions = questionsSnap.size;
        questionsSnap.docs.forEach((doc, index) => {
          correctAnswersMap[index] = doc.data().correct;
        });
      }

      if (totalQuestions === 0) {
        return snap.ref.update({ score: 0, status: "error_no_questions" });
      }

      let correctCount = 0;
      const questionResults: boolean[] = [];
      for (let i = 0; i < totalQuestions; i++) {
        const isCorrect = !!(
          userAnswers[i] && userAnswers[i] === correctAnswersMap[i]
        );
        questionResults.push(isCorrect);
        if (isCorrect) correctCount++;
      }

      const accuracyScore = (correctCount / totalQuestions) * 1000;
      const safeTimeTotal =
        typeof timeTotal === "number" && timeTotal > 0 ? timeTotal : 60;
      const timeLeft = Math.max(0, safeTimeTotal - timeTaken);
      const timeBonus =
        (1 / totalQuestions) * 1000 * (timeLeft / safeTimeTotal);
      const finalScore = Math.floor(accuracyScore + timeBonus);

      // ── Check replay ──────────────────────────────────────────────────────
      const userRef = db.collection("users").doc(userId);
      const userHistoryDocRef = userRef.collection("setsPlayed").doc(gameId);
      const existingHistory = await userHistoryDocRef.get();

      const gameSetUpdate = gameDocRef.update({
        totalPlays: FieldValue.increment(1),
        trendingScore: FieldValue.increment(10),
        lastPlayedAt: FieldValue.serverTimestamp(),
      });

      if (existingHistory.exists) {
        console.log(
          `User ${userId} has played set ${gameId} before. Marking as Replay.`,
        );
        await Promise.all([
          snap.ref.update({
            status: "graded_replay",
            score: finalScore,
            correctCount,
            totalQuestions,
            questionResults,
            correctAnswers: correctAnswersMap,
            gradedAt: FieldValue.serverTimestamp(),
            isFirstAttempt: false,
          }),
          userHistoryDocRef.update({
            history: FieldValue.arrayUnion(snap.id),
            lastPlayedAt: FieldValue.serverTimestamp(),
            title: gameTitle,
          }),
          gameSetUpdate,
        ]);
        return;
      }

      const txResult = await db.runTransaction(async (txn) => {
        const setSnap = await txn.get(gameDocRef);
        const currentCount = setSnap.data()?.firstAttemptCount ?? 0;
        const alreadyActivated = setSnap.data()?.ratingActivated === true;
        const newCount = currentCount + 1;

        const setUpdates: Record<string, any> = { firstAttemptCount: newCount };
        if (newCount >= 25 && !alreadyActivated) {
          setUpdates.ratingActivated = true;
          setUpdates.activatedAt = FieldValue.serverTimestamp();
        }
        txn.update(gameDocRef, setUpdates);

        return {
          alreadyActivated,
          justActivated: newCount >= 25 && !alreadyActivated,
        };
      });

      const isEarlyEntry = !txResult.alreadyActivated;

      const userSnapForElo = await userRef.get();
      const eloAtSubmission: number = userSnapForElo.data()?.bElo ?? 500;

      const userHistoryData = {
        submission: snap.id,
        history: [snap.id],
        correctCount,
        totalQuestions,
        timeTaken,
        title: gameTitle,
        playedAt: FieldValue.serverTimestamp(),
        lastPlayedAt: FieldValue.serverTimestamp(),
      };

      const blitzCreatorId = gameDoc.data()?.creator;
      const isOwner = blitzCreatorId === userId;
      const rankedValue = submissionData.ranked === true && !isOwner;

      const ops: Promise<any>[] = [
        snap.ref.update({
          score: finalScore,
          correctCount,
          totalQuestions,
          questionResults,
          correctAnswers: correctAnswersMap,
          status: "graded",
          isFirstAttempt: true,
          ranked: rankedValue,
          earlyEntry: isEarlyEntry,
          eloAtSubmission,
          gradedAt: FieldValue.serverTimestamp(),
        }),
        userRef.update({ playedGameIds: FieldValue.arrayUnion(gameId) }),
        gameSetUpdate,
      ];
      if (rankedValue) {
        ops.push(userHistoryDocRef.set(userHistoryData));
      }
      await Promise.all(ops);
      if (txResult.justActivated) {
        if (!isOwner) {
          await activateContest(gameId, gameTitle, {
            submissionId: snap.id,
            userId,
            score: finalScore,
            correctCount,
            totalQuestions,
          });
        } else {
          console.log(
            `Owner ${userId} triggered activation for ${gameId} but was excluded from rating.`,
          );
        }
      } else if (txResult.alreadyActivated) {
        if (!isOwner) {
          await rateParticipant(userId, snap.id, gameId, finalScore);
        } else {
          console.log(
            `Owner ${userId} played their own contest ${gameId} — no Elo applied.`,
          );
        }
      } else {
        console.log(
          `Contest ${gameId}: pre-activation (earlyEntry). No rating change for ${userId}.`,
        );
      }
      return;
    } catch (error) {
      console.error(`Error grading ${snap.id}:`, error);
      return snap.ref.update({
        status: "error_unexpected",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

export const getPublicQuestions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to start a game.",
    );
  }

  const gameId = request.data.gameId;
  if (!gameId || typeof gameId !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "A valid 'gameId' must be provided.",
    );
  }

  try {
    const setDocRef = db.collection("sets").doc(gameId);
    const setDoc = await setDocRef.get();

    if (setDoc.exists) {
      const setData = setDoc.data();

      if (
        setData?.questions &&
        Array.isArray(setData.questions) &&
        setData.questions.length > 0
      ) {
        const publicQuestions = setData.questions.map((q: any) => {
          const transformed: any = {
            id: q.id,
            content: q.question || q.content || "",
          };

          if (q.answers && Array.isArray(q.answers)) {
            const choiceKeys = ["a", "b", "c", "d", "e"];
            q.answers.forEach((answer: string, index: number) => {
              if (index < choiceKeys.length) {
                transformed[choiceKeys[index]] = answer;
              }
            });
          }

          if (q.imgURL || q.imageUrl) {
            transformed.imgURL = q.imgURL || q.imageUrl;
          }

          return transformed;
        });
        return { questions: publicQuestions };
      }
    }

    const questionsColRef = db
      .collection("sets")
      .doc(gameId)
      .collection("questions");
    const questionsSnap = await questionsColRef.get();

    if (questionsSnap.empty) {
      throw new HttpsError("not-found", "This game has no questions.");
    }

    const publicQuestions = questionsSnap.docs.map((doc) => {
      const { correct, ...publicData } = doc.data();
      return publicData;
    });

    return { questions: publicQuestions };
  } catch (error) {
    console.error("Error fetching public questions:", error);
    throw new HttpsError(
      "internal",
      "An error occurred while fetching the game.",
    );
  }
});

export const aggregateGameRating = onDocumentWritten(
  "user_ratings/{ratingId}",
  async (event) => {
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();

    const gameId = newData?.gameId || oldData?.gameId;
    if (!gameId) {
      console.error("No Game ID found in rating document.");
      return;
    }

    const setRef = db.collection("sets").doc(gameId);

    let countDelta = 0;
    let scoreDelta = 0;

    const isNew = !event.data?.before.exists;
    const isDelete = !event.data?.after.exists;
    const isUpdate = !isNew && !isDelete;

    if (isNew) {
      countDelta = 1;
      scoreDelta = newData?.score || 0;
    } else if (isDelete) {
      countDelta = -1;
      scoreDelta = -(oldData?.score || 0);
    } else if (isUpdate) {
      countDelta = 0;
      scoreDelta = (newData?.score || 0) - (oldData?.score || 0);
    }

    try {
      await db.runTransaction(async (transaction) => {
        const setDoc = await transaction.get(setRef);

        let currentCount = 0;
        let currentSum = 0;

        if (setDoc.exists) {
          const data = setDoc.data();
          currentCount = data?.ratingCount || 0;
          currentSum = data?.ratingSum || 0;
        }

        const newCount = currentCount + countDelta;
        const newSum = currentSum + scoreDelta;
        const newAverage = newCount > 0 ? newSum / newCount : 0;
        const roundedAverage = Math.round(newAverage * 10) / 10;

        transaction.set(
          setRef,
          {
            ratingCount: newCount,
            ratingSum: newSum,
            averageRating: roundedAverage,
            lastRatingUpdate: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });

      console.log(`Successfully aggregated rating for Game ID: ${gameId}`);
    } catch (error) {
      console.error("Failed to aggregate rating:", error);
    }
  },
);

export const onUserProfileUpdate = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();

    if (!newData || !oldData) return;

    // ── Streak update: only triggered by POTD completion ─────────────────────
    const oldPotdIds: string[] = oldData.completedPotdIds || [];
    const newPotdIds: string[] = newData.completedPotdIds || [];
    const oldSet = new Set(oldPotdIds);
    const newlyCompleted = newPotdIds.filter((id) => !oldSet.has(id));

    if (newlyCompleted.length > 0) {
      const todayPst = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Los_Angeles",
      });

      // Guard against double-increment if already updated today
      const lastStreakDate = newData.lastStreakDate as
        | admin.firestore.Timestamp
        | undefined;
      if (lastStreakDate) {
        const lastDatePst = lastStreakDate
          .toDate()
          .toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
        if (lastDatePst === todayPst) {
          // Already incremented streak today — skip
        } else {
          await db
            .collection("users")
            .doc(event.params.userId)
            .update({
              streak: FieldValue.increment(1),
              lastStreakDate: FieldValue.serverTimestamp(),
            });
          console.log(`Streak incremented for user ${event.params.userId} (POTD ${newlyCompleted[0]})`);
        }
      } else {
        // No prior streak date — first time ever
        await db
          .collection("users")
          .doc(event.params.userId)
          .update({
            streak: FieldValue.increment(1),
            lastStreakDate: FieldValue.serverTimestamp(),
          });
        console.log(`Streak incremented for user ${event.params.userId} (POTD ${newlyCompleted[0]})`);
      }
    }

    // ── Profile sync to gameSubmissions ──────────────────────────────────────
    const nameChanged = newData.displayName !== oldData.displayName;
    const handleChanged = newData.username !== oldData.username;
    const photoChanged = newData.photoURL !== oldData.photoURL;

    if (!nameChanged && !handleChanged && !photoChanged) return;

    console.log(`Syncing profile update for user ${event.params.userId}...`);

    const submissionsQuery = db
      .collection("gameSubmissions")
      .where("userId", "==", event.params.userId);

    const snapshot = await submissionsQuery.get();
    if (snapshot.empty) return;

    const BATCH_SIZE = 500;
    const batches: Promise<FirebaseFirestore.WriteResult[]>[] = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    snapshot.docs.forEach((doc) => {
      currentBatch.update(doc.ref, {
        username: newData.displayName || "Unknown",
        handle: newData.username || "",
        photoURL: newData.photoURL || "",
      });
      operationCount++;

      if (operationCount === BATCH_SIZE) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCount = 0;
      }
    });

    if (operationCount > 0) batches.push(currentBatch.commit());

    await Promise.all(batches);

    console.log(
      `Successfully updated ${snapshot.size} submissions for user ${event.params.userId} across ${batches.length} batches.`,
    );
  },
);

export const resetStreaksDaily = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (_event) => {
    console.log("Starting Daily Streak Reset...");

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const usersSnapshot = await db
      .collection("users")
      .where("streak", ">", 0)
      .where(
        "lastStreakDate",
        "<",
        admin.firestore.Timestamp.fromDate(cutoffDate),
      )
      .get();

    if (usersSnapshot.empty) {
      console.log("No streaks to reset today.");
      return;
    }

    console.log(`Found ${usersSnapshot.size} users with broken streaks.`);

    const batchSize = 500;
    const batches = [];
    let currentBatch = db.batch();
    let operationCounter = 0;

    usersSnapshot.docs.forEach((doc) => {
      currentBatch.update(doc.ref, { streak: 0 });
      operationCounter++;

      if (operationCounter === batchSize) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCounter = 0;
      }
    });

    if (operationCounter > 0) batches.push(currentBatch.commit());

    await Promise.all(batches);
    console.log(`Successfully reset streaks for ${usersSnapshot.size} users.`);
  },
);

export const decayTrendingScores = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (_event) => {
    console.log("Starting Trending Score Decay...");

    const setsRef = db.collection("sets");
    const activeSetsSnapshot = await setsRef
      .where("trendingScore", ">", 0)
      .get();

    if (activeSetsSnapshot.empty) {
      console.log("No active trending games to decay.");
      return;
    }

    console.log(`Decaying scores for ${activeSetsSnapshot.size} active games.`);

    const batchSize = 500;
    const batches: Promise<FirebaseFirestore.WriteResult[]>[] = [];
    let currentBatch = db.batch();
    let operationCount = 0;

    activeSetsSnapshot.docs.forEach((doc) => {
      const currentScore = doc.data().trendingScore || 0;
      const newScore = Math.floor(currentScore * 0.95);

      currentBatch.update(doc.ref, { trendingScore: newScore });
      operationCount++;

      if (operationCount === batchSize) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCount = 0;
      }
    });

    if (operationCount > 0) batches.push(currentBatch.commit());

    await Promise.all(batches);
    console.log("Trending scores updated successfully.");
  },
);

// ── POTD auto-publish ─────────────────────────────────────────────────────────
// Runs at 00:05 America/Los_Angeles every day.
// Finds items in potdQueue whose date matches today (PST) and status is
// "queued" or "scheduled", copies them into the `potd` collection, then
// marks them "published" in the queue.
export const publishScheduledPotd = onSchedule(
  {
    schedule: "0 0 * * *",
    timeZone: "America/Los_Angeles",
  },
  async () => {
    // Today's date string in PST as YYYY-MM-DD
    const todayPst = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Los_Angeles",
    }); // "en-CA" gives YYYY-MM-DD

    console.log(`publishScheduledPotd: checking for date=${todayPst}`);

    const queueSnap = await db
      .collection("potdQueue")
      .where("date", "==", todayPst)
      .where("status", "in", ["queued", "scheduled"])
      .get();

    if (queueSnap.empty) {
      console.log("No items to publish today.");
      return;
    }

    const batch = db.batch();

    queueSnap.docs.forEach((queueDoc) => {
      const data = queueDoc.data();

      // Build the potd document — same shape getCachedPuzzles expects
      const potdRef = db.collection("potd").doc(queueDoc.id);
      batch.set(potdRef, {
        title: data.title || "",
        question: data.question || "",
        explanation: data.explanation || "",
        topic: data.topic || "General",
        date: todayPst,
        multiSelect: data.multiSelect || false,
        options: data.options || [],
        correct: data.correct || [],
        // Flat option fields (a/b/c/d/e) for getCachedPuzzles fallback
        ...(data.a !== undefined && { a: data.a }),
        ...(data.b !== undefined && { b: data.b }),
        ...(data.c !== undefined && { c: data.c }),
        ...(data.d !== undefined && { d: data.d }),
        ...(data.e !== undefined && { e: data.e }),
        imageUrl: data.imageUrl || "",
        imageAlt: data.imageAlt || "",
        publishedAt: FieldValue.serverTimestamp(),
        publishedBy: "scheduler",
      });

      // Mark the queue item as published
      batch.update(queueDoc.ref, {
        status: "published",
        publishedAt: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log(`Published ${queueSnap.size} POTD item(s) for ${todayPst}.`);
  },
);
