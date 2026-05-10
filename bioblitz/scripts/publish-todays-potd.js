const path = require("path");
const admin = require("firebase-admin");

const serviceAccountPath = path.resolve(process.cwd(), "../firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

async function main() {
  const todayPst = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Los_Angeles",
  });

  console.log(`Publishing POTD for date: ${todayPst}`);

  const queueSnap = await db
    .collection("potdQueue")
    .where("status", "in", ["queued", "scheduled"])
    .get();

  if (queueSnap.empty) {
    console.log("No queued or scheduled items found in potdQueue.");
    process.exit(0);
  }

  // Normalize whatever the date field contains to a YYYY-MM-DD string
  function toDateString(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") {
      return value.toDate().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    }
    if (value instanceof Date) {
      return value.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    }
    // Plain string — take just the date portion
    return String(value).slice(0, 10);
  }

  const todayDocs = queueSnap.docs.filter((doc) => {
    const dateStr = toDateString(doc.data().date);
    console.log(`  doc ${doc.id}: date field = ${JSON.stringify(doc.data().date)} → ${dateStr}`);
    return dateStr === todayPst;
  });

  if (todayDocs.length === 0) {
    console.log("No items matched today's date after inspecting all documents.");
    process.exit(0);
  }

  console.log(`Found ${todayDocs.length} item(s) to publish.`);

  const batch = db.batch();

  todayDocs.forEach((queueDoc) => {
    const data = queueDoc.data();

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
      ...(data.a !== undefined && { a: data.a }),
      ...(data.b !== undefined && { b: data.b }),
      ...(data.c !== undefined && { c: data.c }),
      ...(data.d !== undefined && { d: data.d }),
      ...(data.e !== undefined && { e: data.e }),
      imageUrl: data.imageUrl || "",
      imageAlt: data.imageAlt || "",
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
      publishedBy: "manual-script",
    });

    batch.update(queueDoc.ref, {
      status: "published",
      publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`  - "${data.title || queueDoc.id}"`);
  });

  await batch.commit();
  console.log("Done. The POTD is now live (cache may take up to 1 hour to refresh).");
}

main().catch((err) => {
  console.error("Failed to publish POTD:", err);
  process.exit(1);
});
