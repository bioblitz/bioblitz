//import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore"
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();
const db = admin.firestore();

export const gradeTest = onDocumentCreated("gameSubmissions/{submissionId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log("No data associated with the event, exiting function.");
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

    const timeTotal = gameDoc.data()?.timeLimit as number;
    if (typeof timeTotal !== "number" || timeTotal <= 0) {
      console.error("Invalid 'timeLimit' on game set:", gameId);
      return snap.ref.update({ status: "error_invalid_time_limit" });
    }

    const questionsColRef = gameDocRef.collection("questions");
    const questionsSnap = await questionsColRef.get();
    const totalQuestions = questionsSnap.size;

    if (totalQuestions === 0) {
      console.error("Game has no questions:", gameId);
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
    const timeLeft = timeTotal - timeTaken;
    const timeBonus = (1 / totalQuestions) * 1000 * (timeLeft / timeTotal);
    const finalScore = Math.floor(accuracyScore + timeBonus);

    // --- EDITED PART: Create a new document in the user's 'setsPlayed' subcollection ---

    // 1. Create a reference to the new document in the subcollection.
    // The document will be named with the game's ID.
    const userHistoryDocRef = db
      .collection("users")
      .doc(userId)
      .collection("setsPlayed")
      .doc(gameId);

    // 2. Prepare the data for this new document.
    const userHistoryData = {
      submission: snap.id, // The ID of the submission document
      score: finalScore,
    };
    
    // 3. Prepare the update for the original submission document.
    const submissionUpdateData = {
        score: finalScore,
        correctCount: correctCount,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswersMap,
        status: "graded",
        gradedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4. Run both database writes at the same time.
    console.log(`Grading submission ${snap.id} and updating user history for ${userId}. Score: ${finalScore}`);
    await Promise.all([
        snap.ref.update(submissionUpdateData),
        userHistoryDocRef.set(userHistoryData) // Use set() to create/overwrite the document
    ]);

    return; // Function succeeded.

  } catch (error) {
    console.error(`An unexpected error occurred grading ${snap.id}:`, error);
    return snap.ref.update({
      status: "error_unexpected",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

  // NEW: Callable function to securely fetch questions for a game.
export const getPublicQuestions = onCall(async (request) => {
  // Check if the user is authenticated.
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

    // Read the full question data, then create a "safe" version for the client.
    const publicQuestions = questionsSnap.docs.map(doc => {
      const { correct, ...publicData } = doc.data(); // Destructure to remove 'correct'
      return publicData; // Return only the public fields
    });

    return { questions: publicQuestions };
  } catch (error) {
    console.error("Error fetching public questions:", error);
    throw new HttpsError("internal", "An error occurred while fetching the game.");
  }
});