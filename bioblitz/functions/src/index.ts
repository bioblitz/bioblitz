import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore"; // <--- Import FieldValue

admin.initializeApp();
const db = admin.firestore();

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

    const db = admin.firestore();
    const gameDocRef = db.collection("sets").doc(gameId);
    const gameDoc = await gameDocRef.get();

    if (!gameDoc.exists) {
      console.error("Game set not found:", gameId);
      return snap.ref.update({ status: "error_game_not_found" });
    }

    const gameTitle = gameDoc.data()?.title || gameDoc.data()?.name || "Woah so vintage";
    const timeTotal = gameDoc.data()?.timeLimit as number;

    // --- 1. Fetch Questions & Calculate Score ---
    const questionsColRef = gameDocRef.collection("questions");
    const questionsSnap = await questionsColRef.get();
    const totalQuestions = questionsSnap.size;

    if (totalQuestions === 0) {
      return snap.ref.update({ score: 0, status: "error_no_questions" });
    }

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

    const userRef = db.collection("users").doc(userId);
    const userHistoryDocRef = userRef.collection("setsPlayed").doc(gameId);
    const existingHistory = await userHistoryDocRef.get();

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
              note: "Replay: Elo not updated."
          }),
          userHistoryDocRef.update({
             history: FieldValue.arrayUnion(snap.id),
             lastPlayedAt: FieldValue.serverTimestamp(),
             title: gameTitle 
          })
        ]);
        return;
    }

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

    // Add CURRENT game (Weight = 1.0)
    weightedScoreSum += finalScore * 1.0;
    totalWeight += 1.0;

    const newBElo = Math.round(weightedScoreSum / totalWeight);

    // 4. Update Database for First Attempt
    const userHistoryData = {
      submission: snap.id, 
      history: [snap.id], // Initialize array with this submission
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
        gradedAt: FieldValue.serverTimestamp(),
    };

    console.log(`First Attempt: Updating bElo to ${newBElo}`);
    
    await Promise.all([
        snap.ref.update(submissionUpdateData),
        userHistoryDocRef.set(userHistoryData),
        userRef.update({ bElo: newBElo })
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