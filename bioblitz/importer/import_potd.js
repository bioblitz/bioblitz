const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Paths (adjust if needed)
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccountKey.json");
const JSON_PATH = path.join(__dirname, "potd_import.json");

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
});

const db = admin.firestore();

// Firestore batch limit is 500 writes; using safe headroom
const BATCH_LIMIT = 450;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function toTimestamp(dateString) {
  // Expects ISO string like "2026-01-04T12:00:00-05:00"
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return admin.firestore.Timestamp.fromDate(d);
}

async function run() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  if (!Array.isArray(data.potd)) throw new Error("potd_import.json must contain { potd: [...] }");

  const chunks = chunk(data.potd, BATCH_LIMIT);

  for (let i = 0; i < chunks.length; i++) {
    const batch = db.batch();

    for (const item of chunks[i]) {
      if (!item.docId) throw new Error("Each item needs docId (e.g., 2026-1-4)");

      const ref = db.collection("potd").doc(item.docId);

      batch.set(
        ref,
        {
          a: item.a ?? "",
          b: item.b ?? "",
          c: item.c ?? "",
          d: item.d ?? "",
          e: item.e ?? "",
          correct: Array.isArray(item.correct) ? item.correct : [],
          date: item.date ? toTimestamp(item.date) : null,
          multiSelect: !!item.multiSelect,
          question: item.question ?? "",
          title: item.title ?? "",
          topic: item.topic ?? ""
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`Committed batch ${i + 1}/${chunks.length}`);
  }

  console.log(`✅ POTD import complete: ${data.potd.length} docs into potd/`);
}

run().catch((err) => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});
