const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "august_set.json");
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const BATCH_LIMIT = 450;

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function run() {
  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const data = JSON.parse(raw);

  if (!data?.setDoc?.setId) throw new Error("Missing setDoc.setId");
  if (!Array.isArray(data.questions)) throw new Error("Missing questions array");

  const setId = data.setDoc.setId;
  const setRef = db.collection("sets").doc(setId);

  const setPayload = {
    averageRating: data.setDoc.averageRating ?? 0,
    description: data.setDoc.description ?? "",
    hidden: data.setDoc.hidden ?? false,
    lastRatingUpdate: null,
    questionCount: data.questions.length,
    ratingCount: data.setDoc.ratingCount ?? 0,
    ratingSum: data.setDoc.ratingSum ?? 0,
    source: data.setDoc.source ?? "",
    timeLimit: data.setDoc.timeLimit ?? 0,
    title: data.setDoc.title ?? "",
    topic: data.setDoc.topic ?? "general",
    type: data.setDoc.type ?? "USABO",
  };

  await setRef.set(setPayload, { merge: true });

  const chunks = chunkArray(data.questions, BATCH_LIMIT);

  for (let i = 0; i < chunks.length; i++) {
    const batch = db.batch();

    for (const q of chunks[i]) {
      if (!q.docId) throw new Error("A question is missing docId");

      const qRef = setRef.collection("questions").doc(q.docId);

      batch.set(
        qRef,
        {
          a: q.a ?? "",
          b: q.b ?? "",
          c: q.c ?? "",
          d: q.d ?? "",
          e: q.e ?? "",
          correct: (q.correct ?? "").toLowerCase(),
          content: q.content ?? "",
          imgURL: q.imgURL ?? "",
          solution: q.solution ?? "",
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`Committed batch ${i + 1}/${chunks.length}`);
  }

  console.log(`Import complete: sets/${setId} with ${data.questions.length} questions`);
}

run().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
