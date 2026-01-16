import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated, onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

// 1. Initialize Once
admin.initializeApp();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// 1. GRADE TEST (Calculates Score + Elo + History + UPDATES TRENDING)
// ---------------------------------------------------------------------------
export const gradeTest = onDocumentCreated("gameSubmissions/{submissionId}", async (event) => {
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

    // Fetch Game Metadata
    const gameDocRef = db.collection("sets").doc(gameId);
    const gameDoc = await gameDocRef.get();

    if (!gameDoc.exists) {
      console.error("Game set not found:", gameId);
      return snap.ref.update({ status: "error_game_not_found" });
    }

    const gameTitle = gameDoc.data()?.title || gameDoc.data()?.name || "Untitled Set";
    const timeTotal = gameDoc.data()?.timeLimit as number;

    // Fetch Questions
    const questionsColRef = gameDocRef.collection("questions");
    const questionsSnap = await questionsColRef.get();
    const totalQuestions = questionsSnap.size;

    if (totalQuestions === 0) {
      return snap.ref.update({ score: 0, status: "error_no_questions" });
    }

    // Calculate Score
    const correctAnswersMap: { [key: number]: string } = {};
    questionsSnap.docs.forEach((doc, index) => {
      correctAnswersMap[index] = doc.data().correct;
    });

    let correctCount = 0;
    for (let i = 0; i < totalQuestions; i++) {
      if (userAnswers[i] && userAnswers[i] === correctAnswersMap[i]) {
        correctCount++;
      }
    }

    const accuracyScore = (correctCount / totalQuestions) * 1000;
    const safeTimeTotal = (typeof timeTotal === "number" && timeTotal > 0) ? timeTotal : 60;
    const timeLeft = Math.max(0, safeTimeTotal - timeTaken);
    const timeBonus = (1 / totalQuestions) * 1000 * (timeLeft / safeTimeTotal);
    const finalScore = Math.floor(accuracyScore + timeBonus);

    // Check for Previous Plays (Replay Detection)
    const userRef = db.collection("users").doc(userId);
    const userHistoryDocRef = userRef.collection("setsPlayed").doc(gameId);
    const existingHistory = await userHistoryDocRef.get();

    // <--- NEW: Prepare the Game Set Update (Trending Logic) --->
    // Increments 'trendingScore' by 10 and updates 'lastPlayedAt'
    const gameSetUpdate = gameDocRef.update({
        totalPlays: FieldValue.increment(1),
        trendingScore: FieldValue.increment(10), 
        lastPlayedAt: FieldValue.serverTimestamp()
    });

    // --- REPLAY LOGIC ---
    if (existingHistory.exists) {
        console.log(`User ${userId} has played set ${gameId} before. Marking as Replay.`);
 
        await Promise.all([
          snap.ref.update({ 
              status: "graded_replay", 
              score: finalScore,
              correctCount: correctCount,
              totalQuestions: totalQuestions,
              correctAnswers: correctAnswersMap,
              gradedAt: FieldValue.serverTimestamp(),
              isFirstAttempt: false
            }),
          userHistoryDocRef.update({
             history: FieldValue.arrayUnion(snap.id),
             lastPlayedAt: FieldValue.serverTimestamp(),
             title: gameTitle 
          }),
          gameSetUpdate // <--- ADDED HERE
        ]);
        return;
    }

    // --- FIRST ATTEMPT LOGIC (Calculate Elo) ---
    const allSetsPlayedSnap = await userRef.collection("setsPlayed").get();
    
    let weightedScoreSum = 0;
    let totalWeight = 0;
    const now = Date.now();
    const DAY_IN_MS = 1000 * 60 * 60 * 24;
    const DECAY_DAYS = 30; 

    allSetsPlayedSnap.forEach((doc) => {
        const data = doc.data();
        const score = data.score;
        const playedAtVal = data.playedAt?.toDate().getTime() || (now - (60 * DAY_IN_MS));

        if (typeof score === 'number') {
            const daysAgo = Math.max(0, (now - playedAtVal) / DAY_IN_MS);
            const weight = Math.exp(-daysAgo / DECAY_DAYS);
            weightedScoreSum += (score * weight);
            totalWeight += weight;
        }
    });

    // Add CURRENT game
    weightedScoreSum += finalScore * 1.0;
    totalWeight += 1.0;

    const newBElo = Math.round(weightedScoreSum / totalWeight);

    // Database Updates
    const userHistoryData = {
      submission: snap.id, 
      history: [snap.id],
      score: finalScore,
      title: gameTitle,
      playedAt: FieldValue.serverTimestamp(),
      lastPlayedAt: FieldValue.serverTimestamp()
    };
    
    const submissionUpdateData = {
        score: finalScore,
        correctCount: correctCount,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswersMap,
        status: "graded",
        isFirstAttempt: true,
        gradedAt: FieldValue.serverTimestamp(),
    };

    console.log(`First Attempt: Updating bElo to ${newBElo}`);
    
    await Promise.all([
        snap.ref.update(submissionUpdateData),
        userHistoryDocRef.set(userHistoryData),
        userRef.update({ 
            bElo: newBElo,
            playedGameIds: FieldValue.arrayUnion(gameId) 
        }),
        gameSetUpdate // <--- ADDED HERE
    ]);

    return;

  } catch (error) {
    console.error(`Error grading ${snap.id}:`, error);
    return snap.ref.update({
      status: "error_unexpected",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ---------------------------------------------------------------------------
// 2. GET PUBLIC QUESTIONS (Callable)
// ---------------------------------------------------------------------------
export const getPublicQuestions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in to start a game.");
  }

  const gameId = request.data.gameId;
  if (!gameId || typeof gameId !== "string") {
    throw new HttpsError("invalid-argument", "A valid 'gameId' must be provided.");
  }

  try {
    const questionsColRef = db.collection("sets").doc(gameId).collection("questions");
    const questionsSnap = await questionsColRef.get();

    if (questionsSnap.empty) {
      throw new HttpsError("not-found", "This game has no questions.");
    }

    const publicQuestions = questionsSnap.docs.map(doc => {
      const { correct, ...publicData } = doc.data(); 
      return publicData; 
    });

    return { questions: publicQuestions };
  } catch (error) {
    console.error("Error fetching public questions:", error);
    throw new HttpsError("internal", "An error occurred while fetching the game.");
  }
});

// ---------------------------------------------------------------------------
// 3. AGGREGATE RATINGS (Trigger)
// ---------------------------------------------------------------------------
export const aggregateGameRating = onDocumentWritten("user_ratings/{ratingId}", async (event) => {
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();

    // Identify Game ID
    const gameId = newData?.gameId || oldData?.gameId;
    if (!gameId) {
        console.error("No Game ID found in rating document.");
        return;
    }

    const setRef = db.collection("sets").doc(gameId);

    // Deltas
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
            const newAverage = newCount > 0 ? (newSum / newCount) : 0;
            const roundedAverage = Math.round(newAverage * 10) / 10;

            transaction.set(setRef, {
                ratingCount: newCount,
                ratingSum: newSum,
                averageRating: roundedAverage,
                lastRatingUpdate: FieldValue.serverTimestamp()
            }, { merge: true });
        });

        console.log(`Successfully aggregated rating for Game ID: ${gameId}`);
    } catch (error) {
        console.error("Failed to aggregate rating:", error);
    }
});

// ---------------------------------------------------------------------------
// 4. SYNC USER PROFILE CHANGES (Handles Unlimited Games)
// ---------------------------------------------------------------------------
export const onUserProfileUpdate = onDocumentUpdated("users/{userId}", async (event) => {
    const newData = event.data?.after.data();
    const oldData = event.data?.before.data();

    if (!newData || !oldData) return;

    // 1. Check if visual fields actually changed
    const nameChanged = newData.displayName !== oldData.displayName;
    const handleChanged = newData.username !== oldData.username; 
    const photoChanged = newData.photoURL !== oldData.photoURL;

    if (!nameChanged && !handleChanged && !photoChanged) {
        return;
    }

    console.log(`Syncing profile update for user ${event.params.userId}...`);
    
    // 2. Fetch ALL submissions 
    const submissionsQuery = db.collection("gameSubmissions")
                               .where("userId", "==", event.params.userId);
    
    const snapshot = await submissionsQuery.get();
    
    if (snapshot.empty) return;

    // 3. Prepare the Updates in Chunks of 500
    const BATCH_SIZE = 500;
    const batches: Promise<FirebaseFirestore.WriteResult[]>[] = [];
    
    let currentBatch = db.batch();
    let operationCount = 0;

    snapshot.docs.forEach((doc) => {
        // Add update to the current batch
        currentBatch.update(doc.ref, {
            username: newData.displayName || "Unknown",
            handle: newData.username || "",
            photoURL: newData.photoURL || ""
        });
        
        operationCount++;

        // If we hit the limit, commit this batch and start a new one
        if (operationCount === BATCH_SIZE) {
            batches.push(currentBatch.commit());
            currentBatch = db.batch(); // Reset
            operationCount = 0; // Reset
        }
    });

    // 4. Commit any remaining operations 
    if (operationCount > 0) {
        batches.push(currentBatch.commit());
    }

    // 5. Wait for all batches to finish
    await Promise.all(batches);

    console.log(`Successfully updated ${snapshot.size} submissions for user ${event.params.userId} across ${batches.length} batches.`);
});


// ---------------------------------------------------------------------------
// 5. DAILY STREAK RESET (Scheduled)
// ---------------------------------------------------------------------------
export const resetStreaksDaily = onSchedule(
  {
    schedule: "0 0 * * *", 
    timeZone: "America/Los_Angeles", 
    timeoutSeconds: 540, 
    memory: "512MiB",
  },
  async (event) => {
    console.log("Starting Daily Streak Reset...");

    const now = new Date();
    // midnight pst
    const cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const usersSnapshot = await db.collection("users")
      .where("streak", ">", 0)
      .where("lastStreakDate", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
      .get();

    if (usersSnapshot.empty) {
      console.log("No streaks to reset today.");
      return;
    }

    console.log(`Found ${usersSnapshot.size} users with broken streaks.`);

    // batch update
    const batchSize = 500;
    const batches = [];
    let currentBatch = db.batch();
    let operationCounter = 0;

    usersSnapshot.docs.forEach((doc) => {
      // set streak to 0
      currentBatch.update(doc.ref, { streak: 0 });
      operationCounter++;

      if (operationCounter === batchSize) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCounter = 0;
      }
    });

    if (operationCounter > 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);

    console.log(`Successfully reset streaks for ${usersSnapshot.size} users.`);
  }
);

// ---------------------------------------------------------------------------
// 6. DECAY TRENDING SCORES (Runs Hourly) - [NEW FUNCTION]
// ---------------------------------------------------------------------------
export const decayTrendingScores = onSchedule(
  {
    schedule: "0 * * * *", // Runs at minute 0 of every hour
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (event) => {
    console.log("📉 Starting Trending Score Decay...");

    // Optimization: Only fetch games that actually have a score > 0.
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
      
      // Decay by 5% every hour
      const newScore = Math.floor(currentScore * 0.95);

      currentBatch.update(doc.ref, { 
        trendingScore: newScore 
      });
      
      operationCount++;

      if (operationCount === batchSize) {
        batches.push(currentBatch.commit());
        currentBatch = db.batch();
        operationCount = 0;
      }
    });

    if (operationCount > 0) {
      batches.push(currentBatch.commit());
    }

    await Promise.all(batches);
    console.log("📉 Trending scores updated successfully.");
  }
);