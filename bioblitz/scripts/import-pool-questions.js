/**
 * Imports questions from an authoring JSON file into the staff question pool.
 *
 * Mirrors buildPoolDocData() in src/lib/questionPool.ts so imported questions are
 * indistinguishable from ones added through the staff UI. Writes a ref -> pool id
 * map next to the input file so sets can be built from these questions later.
 *
 * Usage: node scripts/import-pool-questions.js <input.json> [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const DRY_RUN = process.argv.includes("--dry-run");
const inputArg = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!inputArg) {
  console.error("Usage: node scripts/import-pool-questions.js <input.json> [--dry-run]");
  process.exit(1);
}
const inputPath = path.resolve(process.cwd(), inputArg);
const mapPath = inputPath.replace(/\.json$/, "_pool_ids.json");

const CHOICE_KEYS = ["a", "b", "c", "d", "e"];
const TOPICS = [
  "Anatomy & Physiology", "Cell Biology", "Plant Biology", "Genetics & Evolution",
  "Biosystematics", "Ecology", "Ethology", "Multiple", "Other",
];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];

// Attribution for the imported questions.
const CREATED_BY = "7Bj15hpdOpSMZY662UWHFAUPjl53";
const CREATED_BY_USERNAME = "mitosisphere";
const SOURCE = "ai";

const cleanHtml = (html) => (html || "").replace(/&nbsp;/g, " ");
const stripHtml = (html) =>
  cleanHtml(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const normalizeTopic = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "Other";
  return TOPICS.find((t) => t.toLowerCase() === value.toLowerCase()) || value;
};
const normalizeDifficulty = (raw) =>
  DIFFICULTIES.find((d) => d.toLowerCase() === String(raw || "").trim().toLowerCase()) ||
  "Medium";

function buildDoc(q) {
  const choices = (q.choices || []).slice(0, CHOICE_KEYS.length);
  const correctLetters = (q.correctIndices || [])
    .filter((i) => i >= 0 && i < choices.length)
    .map((i) => CHOICE_KEYS[i]);
  const isMultiSelect = correctLetters.length > 1;

  // Figure questions are tagged so they can be found in the pool and completed by hand.
  const tags = [...(q.tags || []), ...(q.needsFigure ? ["needs-figure"] : [])]
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 12);

  const doc = {
    content: cleanHtml(q.content),
    correct: isMultiSelect ? correctLetters : (correctLetters[0] ?? ""),
    imgURL: "",
    solution: q.solution || "",
    plainText: stripHtml(q.content).slice(0, 2000),
    topic: normalizeTopic(q.topic),
    difficulty: normalizeDifficulty(q.difficulty),
    tags,
    source: SOURCE,
    usedInSetIds: [],
    createdBy: CREATED_BY,
    createdByUsername: CREATED_BY_USERNAME,
  };
  if (isMultiSelect) doc.multipleCorrect = true;
  choices.forEach((text, idx) => {
    doc[CHOICE_KEYS[idx]] = String(text);
  });
  return doc;
}

function validate(doc, ref) {
  const errors = [];
  if (!stripHtml(doc.content)) errors.push(`${ref}: empty content`);
  const choiceCount = CHOICE_KEYS.filter((k) => doc[k]).length;
  if (choiceCount < 2) errors.push(`${ref}: fewer than two choices`);
  if (CHOICE_KEYS.some((k) => k in doc && !String(doc[k]).trim()))
    errors.push(`${ref}: empty choice text`);
  const correct = Array.isArray(doc.correct) ? doc.correct : [doc.correct];
  if (correct.filter(Boolean).length === 0) errors.push(`${ref}: no correct answer`);
  if (!TOPICS.includes(doc.topic)) errors.push(`${ref}: topic "${doc.topic}" is not a known topic`);
  return errors;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const questions = data.questions || [];
  if (questions.length === 0) {
    console.error("No questions in input file.");
    process.exit(1);
  }

  const docs = questions.map((q) => ({ ref: q.ref, doc: buildDoc(q), needsFigure: !!q.needsFigure }));
  const errors = docs.flatMap(({ doc, ref }) => validate(doc, ref));
  if (errors.length > 0) {
    console.error(`Refusing to import — ${errors.length} validation error(s):`);
    errors.forEach((e) => console.error("  -", e));
    process.exit(1);
  }

  console.log(`Mode      : ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Input     : ${inputPath}`);
  console.log(`Questions : ${docs.length} (${docs.filter((d) => d.needsFigure).length} tagged needs-figure)`);
  console.log(`Attributed: ${CREATED_BY_USERNAME} (${CREATED_BY}), source="${SOURCE}"`);

  if (DRY_RUN) {
    const sample = docs[0];
    console.log(`\nSample document (${sample.ref}):`);
    console.log(JSON.stringify(sample.doc, null, 2));
    console.log("\nNo writes performed.");
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert(
      path.resolve(__dirname, "..", "firebase-service-account.json"),
    ),
  });
  const db = admin.firestore();

  const refToId = {};
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach(({ ref, doc }) => {
      const docRef = db.collection("questionPool").doc();
      batch.set(docRef, {
        ...doc,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      refToId[ref] = docRef.id;
    });
    await batch.commit();
    console.log(`  committed ${Math.min(i + 400, docs.length)}/${docs.length}`);
  }

  fs.writeFileSync(
    mapPath,
    JSON.stringify(
      { source: data.source, importedAt: new Date().toISOString(), refToId },
      null,
      2,
    ),
  );
  console.log(`\nImported ${Object.keys(refToId).length} questions into questionPool.`);
  console.log(`Ref map written to ${mapPath}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
