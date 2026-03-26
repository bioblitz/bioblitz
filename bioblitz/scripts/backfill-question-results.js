/**
 * Backfill questionResults for old submissions.
 *
 * For each submission that has correctAnswers + userAnswers but no questionResults,
 * compute the boolean array and write it back.
 *
 * Usage: node scripts/backfill-question-results.js [--dry-run]
 */

const path = require("path");
const admin = require("firebase-admin");

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 499; // Firestore max ops per batch

const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

function computeQuestionResults(userAnswers, correctAnswers, totalQuestions) {
  const results = [];
  for (let i = 0; i < totalQuestions; i++) {
    results.push(!!(userAnswers[i] && userAnswers[i] === correctAnswers[i]));
  }
  return results;
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log("Scanning gameSubmissions...\n");

  let cursor = null;
  let totalScanned = 0;
  let totalSkipped = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  // Page through all submissions in chunks
  while (true) {
    let query = db.collection("gameSubmissions").orderBy("__name__").limit(500);
    if (cursor) query = query.startAfter(cursor);

    const snap = await query.get();
    if (snap.empty) break;

    cursor = snap.docs[snap.docs.length - 1];
    totalScanned += snap.docs.length;

    // Filter to docs that need backfilling
    const toUpdate = snap.docs.filter((doc) => {
      const d = doc.data();
      return (
        d.questionResults == null &&
        d.correctAnswers != null &&
        d.userAnswers != null &&
        typeof d.totalQuestions === "number" &&
        d.totalQuestions > 0
      );
    });

    totalSkipped += snap.docs.length - toUpdate.length;

    if (toUpdate.length === 0) continue;

    // Write in sub-batches of BATCH_SIZE
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const chunk = toUpdate.slice(i, i + BATCH_SIZE);
      if (!DRY_RUN) {
        const batch = db.batch();
        for (const doc of chunk) {
          const d = doc.data();
          try {
            const results = computeQuestionResults(
              d.userAnswers,
              d.correctAnswers,
              d.totalQuestions
            );
            batch.update(doc.ref, { questionResults: results });
          } catch (err) {
            console.error(`  Error on ${doc.id}: ${err.message}`);
            totalErrors++;
          }
        }
        await batch.commit();
      } else {
        // Dry run: just validate
        for (const doc of chunk) {
          const d = doc.data();
          const results = computeQuestionResults(
            d.userAnswers,
            d.correctAnswers,
            d.totalQuestions
          );
          console.log(
            `  [dry] ${doc.id}: totalQuestions=${d.totalQuestions} → [${results.join(",")}]`
          );
        }
      }
      totalUpdated += chunk.length;
    }

    process.stdout.write(`  Scanned ${totalScanned} docs, updated ${totalUpdated} so far...\r`);
  }

  console.log("\n\n── Summary ──────────────────────────────────");
  console.log(`  Scanned : ${totalScanned}`);
  console.log(`  Skipped : ${totalSkipped} (already have questionResults or missing fields)`);
  console.log(`  Updated : ${totalUpdated}`);
  if (totalErrors > 0) console.log(`  Errors  : ${totalErrors}`);
  console.log("─────────────────────────────────────────────");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
