/**
 * Creates sets from pool questions that were imported by import-pool-questions.js.
 *
 * Mirrors POST /api/staff/sets/from-pool. Questions are re-read from the pool at
 * run time, so any edits or figures added in the staff pool since the import are
 * picked up. Run this only after the pool questions are final — set creation
 * copies the question data, and later pool edits do not propagate into a set.
 *
 * Usage:
 *   node scripts/create-sets-from-import.js <input.json> [--dry-run] [--include-figures] [--publish]
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const INCLUDE_FIGURES = args.includes("--include-figures");
const PUBLISH = args.includes("--publish");
const inputArg = args.find((a) => !a.startsWith("--"));
if (!inputArg) {
  console.error(
    "Usage: node scripts/create-sets-from-import.js <input.json> [--dry-run] [--include-figures] [--publish]",
  );
  process.exit(1);
}
const inputPath = path.resolve(process.cwd(), inputArg);
const mapPath = inputPath.replace(/\.json$/, "_pool_ids.json");

const CREATOR_UID = "7Bj15hpdOpSMZY662UWHFAUPjl53";
const MIN_QUESTIONS = 3;
const DIFFICULTY_RANK = { Easy: 0, Medium: 1, Hard: 2 };
// Topics that fall into the mixed-review set rather than a set of their own.
const MIXED_TOPICS = ["Ecology", "Ethology", "Biosystematics"];

function dominant(values, fallback) {
  const counts = new Map();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = fallback;
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

/** Slots held-back figure questions into the set covering their topic. */
function planSets(data) {
  const byRef = new Map(data.questions.map((q) => [q.ref, q]));
  const figures = data.questions.filter((q) => q.needsFigure);
  const mixedIndex = data.sets.findIndex((s) => s.topic === "Multiple");

  return data.sets.map((set, idx) => {
    const refs = [...set.questionRefs];
    if (INCLUDE_FIGURES) {
      figures.forEach((q) => {
        const target =
          MIXED_TOPICS.includes(q.topic) ? mixedIndex
            : data.sets.findIndex((s) => s.topic === q.topic);
        if (target === idx) refs.push(q.ref);
      });
    }
    // Keep each set ordered easy -> hard, with new questions slotted in by difficulty.
    refs.sort(
      (a, b) =>
        DIFFICULTY_RANK[byRef.get(a).difficulty] - DIFFICULTY_RANK[byRef.get(b).difficulty],
    );
    return { ...set, questionRefs: refs };
  });
}

async function main() {
  const data = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (!fs.existsSync(mapPath)) {
    console.error(`Missing ref map ${mapPath}. Run import-pool-questions.js first.`);
    process.exit(1);
  }
  const { refToId } = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const plans = planSets(data);

  const missing = plans.flatMap((s) => s.questionRefs.filter((r) => !refToId[r]));
  if (missing.length > 0) {
    console.error(`Refs with no pool id: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log(`Mode          : ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Figures        : ${INCLUDE_FIGURES ? "included" : "held back"}`);
  console.log(`Publish        : ${PUBLISH ? "yes (public)" : "no (draft, hidden)"}`);
  console.log("");

  admin.initializeApp({
    credential: admin.credential.cert(
      path.resolve(__dirname, "..", "firebase-service-account.json"),
    ),
  });
  const db = admin.firestore();

  const userDoc = await db.collection("users").doc(CREATOR_UID).get();
  if (!userDoc.exists) {
    console.error(`Creator ${CREATOR_UID} not found.`);
    process.exit(1);
  }
  const creator = userDoc.data() || {};
  const creatorPfp = creator.photoURL || "/images/logo.svg";
  const creatorUsername = creator.username || "";

  const created = [];
  for (const plan of plans) {
    const ids = plan.questionRefs.map((r) => refToId[r]);

    // Re-read from the pool so edits and figures made since the import are included.
    const picks = [];
    for (let i = 0; i < ids.length; i += 100) {
      const refs = ids.slice(i, i + 100).map((id) => db.collection("questionPool").doc(id));
      const snaps = await db.getAll(...refs);
      snaps.forEach((s) => {
        if (s.exists) picks.push({ id: s.id, data: s.data() || {} });
      });
    }
    if (picks.length !== ids.length) {
      console.error(`${plan.title}: ${ids.length - picks.length} question(s) missing from pool.`);
      process.exit(1);
    }
    const order = new Map(ids.map((id, i) => [id, i]));
    picks.sort((a, b) => order.get(a.id) - order.get(b.id));

    if (PUBLISH && picks.length < MIN_QUESTIONS) {
      console.error(`${plan.title}: needs at least ${MIN_QUESTIONS} questions to publish.`);
      process.exit(1);
    }

    const difficulty = dominant(picks.map((p) => p.data.difficulty || "Medium"), "Medium");
    const topic = plan.topic || dominant(picks.map((p) => p.data.topic || "Other"), "Multiple");
    // One minute per question, so adding the figure questions extends the set.
    const timeLimit = 60 * picks.length;

    console.log(`${plan.title}`);
    console.log(
      `  ${picks.length} questions · ${Math.round(timeLimit / 60)} min · ${topic} · ${difficulty}`,
    );
    if (INCLUDE_FIGURES) {
      const stillTagged = picks.filter(
        (p) => (p.data.tags || []).includes("needs-figure") && !p.data.imgURL,
      ).length;
      if (stillTagged > 0) console.log(`  warning: ${stillTagged} question(s) still have no figure`);
    }

    if (DRY_RUN) {
      created.push({ title: plan.title, count: picks.length });
      continue;
    }

    const setRef = db.collection("sets").doc();
    await setRef.set({
      title: plan.title,
      description: plan.description || "",
      source: "Question pool",
      topic,
      difficulty,
      timeLimit: String(timeLimit),
      number_of_questions: picks.length.toString(),
      status: PUBLISH ? "completed" : "incomplete",
      incomplete: !PUBLISH,
      tags: PUBLISH ? [] : ["incomplete"],
      hidden: !PUBLISH,
      bannerUrl: "",
      creator: CREATOR_UID,
      creatorPfp,
      creatorUsername,
      rating: 0,
      isAiGenerated: picks.some((p) => p.data.source === "ai"),
      creation: admin.firestore.FieldValue.serverTimestamp(),
      poolQuestionIds: picks.map((p) => p.id),
    });

    const questionsCol = setRef.collection("questions");
    for (let i = 0; i < picks.length; i += 400) {
      const batch = db.batch();
      picks.slice(i, i + 400).forEach(({ id, data }) => {
        const {
          plainText, topic: _t, difficulty: _d, tags, source, usedInSetIds,
          createdAt, updatedAt, createdBy, createdByUsername, ...question
        } = data;
        batch.set(questionsCol.doc(id), { ...question, poolQuestionId: id });
      });
      await batch.commit();
    }

    for (let i = 0; i < picks.length; i += 400) {
      const batch = db.batch();
      picks.slice(i, i + 400).forEach(({ id }) => {
        batch.set(
          db.collection("questionPool").doc(id),
          {
            usedInSetIds: admin.firestore.FieldValue.arrayUnion(setRef.id),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });
      await batch.commit();
    }

    console.log(`  created set ${setRef.id}`);
    created.push({ title: plan.title, id: setRef.id, count: picks.length });
  }

  if (!DRY_RUN && PUBLISH) {
    await db.collection("users").doc(CREATOR_UID).set(
      { publicSetCount: admin.firestore.FieldValue.increment(created.length) },
      { merge: true },
    );
  }

  console.log(
    `\n${DRY_RUN ? "Would create" : "Created"} ${created.length} sets, ` +
      `${created.reduce((a, s) => a + s.count, 0)} questions total.`,
  );
  if (!DRY_RUN) console.log("Edit them at /contests/create/<setId>");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
