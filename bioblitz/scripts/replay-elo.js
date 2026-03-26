/**
 * replay-elo.js
 *
 * Replays the entire submission history and recomputes everyone's Elo from scratch
 * using the current rating system (including the rating-adjusted π̂ shift).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json node scripts/replay-elo.js
 *
 * Phases:
 *   1. Reset  — clear all user ratings, ratingHistory, submission ratingDelta/newElo, set contestRating
 *   2. Load   — fetch all graded submissions, deduplicate to first attempt per (userId, gameId)
 *   3. Replay — process chronologically, activating blitzes at 25 participants
 *   4. Write  — batch-write results back to Firestore
 */

const admin = require("firebase-admin");
const serviceAccount = require("../firebase-service-account.json");

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Rating math — must exactly mirror functions/src/index.ts
// ---------------------------------------------------------------------------

function computeExpectedPercentile(Rp, Rc) {
  const logistic = 1 / (1 + Math.pow(10, (Rc - Rp) / 400));
  const shift = 0.30 * Math.exp(-0.0022 * (Rp - 500));
  return Math.max(0, Math.min(1, logistic - shift));
}

function computeKFactor(Rp, Rc) {
  return 50 * Math.exp(-(Rp - Rc) / 1000);
}

function computeExperienceMultiplier(n) {
  if (n < 25) return 1 + 4 * Math.pow(1 - n / 25, 2);
  return 1.0;
}

function computeInactivityMultiplier(lastContestAt) {
  if (!lastContestAt) return 1.0;
  const daysSince = (Date.now() - lastContestAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.min(1.0 + 0.01 * daysSince, 2.0);
}

function applyIntegerRounding(deltaRaw) {
  if (deltaRaw > 0 && deltaRaw < 1) return Math.ceil(deltaRaw);
  if (deltaRaw < 0 && deltaRaw > -1) return Math.floor(deltaRaw);
  return Math.round(deltaRaw);
}

function computeFinalDelta(Rp, Rc, pi, piHat, Kp, contestsPlayed, lastContestAt, isEarlyEntry, isFirst) {
  const deltaBase = Kp * (pi - piHat);
  const deltaFloor = Math.max(0, (Rc - Rp) / 10000);

  const Mexp   = computeExperienceMultiplier(contestsPlayed);
  const Minact = computeInactivityMultiplier(lastContestAt);
  const Mearly = isEarlyEntry ? 2.0 : 1.0;

  let deltaRaw = deltaBase * Mexp * Minact * Mearly + deltaFloor;
  if (isFirst) deltaRaw = Math.max(deltaRaw, 0);
  return applyIntegerRounding(deltaRaw);
}

// ---------------------------------------------------------------------------
// Batch helpers
// ---------------------------------------------------------------------------

const BATCH_LIMIT = 499;

function makeBatcher() {
  const batches = [];
  let current = db.batch();
  let ops = 0;

  function flush(force = false) {
    if (ops >= BATCH_LIMIT || (force && ops > 0)) {
      batches.push(current);
      current = db.batch();
      ops = 0;
    }
  }

  return {
    set(ref, data, opts) { current.set(ref, data, opts || {}); ops++; flush(); },
    update(ref, data)    { current.update(ref, data);           ops++; flush(); },
    delete(ref)          { current.delete(ref);                 ops++; flush(); },
    async commit() {
      flush(true);
      console.log(`  Committing ${batches.length} batch(es)…`);
      for (const b of batches) await b.commit();
    },
  };
}

// ---------------------------------------------------------------------------
// Phase 1: Reset
// ---------------------------------------------------------------------------

async function resetAll() {
  console.log("\n=== Phase 1: Reset ===");

  // Reset users
  const usersSnap = await db.collection("users").get();
  console.log(`  Resetting ${usersSnap.size} users…`);
  const b1 = makeBatcher();
  for (const doc of usersSnap.docs) {
    b1.update(doc.ref, {
      bElo: 500,
      contestsPlayed: 0,
      lastContestAt: null,
    });
  }
  await b1.commit();

  // Clear ratingHistory subcollections
  console.log("  Clearing ratingHistory subcollections…");
  for (const doc of usersSnap.docs) {
    const histSnap = await doc.ref.collection("ratingHistory").get();
    if (histSnap.empty) continue;
    const bh = makeBatcher();
    for (const h of histSnap.docs) bh.delete(h.ref);
    await bh.commit();
  }

  // Clear ratingDelta / newElo from all submissions
  console.log("  Clearing submission rating fields…");
  const subSnap = await db.collection("gameSubmissions").get();
  const b2 = makeBatcher();
  for (const doc of subSnap.docs) {
    const d = doc.data();
    if (d.ratingDelta !== undefined || d.newElo !== undefined) {
      b2.update(doc.ref, {
        ratingDelta: admin.firestore.FieldValue.delete(),
        newElo:      admin.firestore.FieldValue.delete(),
      });
    }
  }
  await b2.commit();

  // Clear contestRating from sets
  console.log("  Clearing set contestRating fields…");
  const setsSnap = await db.collection("sets").get();
  const b3 = makeBatcher();
  for (const doc of setsSnap.docs) {
    if (doc.data().contestRating !== undefined) {
      b3.update(doc.ref, { contestRating: admin.firestore.FieldValue.delete() });
    }
  }
  await b3.commit();

  console.log("  Reset complete.");
}

// ---------------------------------------------------------------------------
// Phase 2: Load
// ---------------------------------------------------------------------------

async function loadSubmissions() {
  console.log("\n=== Phase 2: Load ===");

  const snap = await db.collection("gameSubmissions")
    .where("correctCount", "!=", null)
    .get();

  console.log(`  Fetched ${snap.size} graded submissions.`);

  // Keep only the earliest submission per (userId, gameId)
  const earliest = new Map(); // key = `${userId}:${gameId}`

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.userId || !d.gameId) continue;

    const key = `${d.userId}:${d.gameId}`;
    const ts  = doc.createTime.toMillis();

    if (!earliest.has(key) || ts < earliest.get(key).ts) {
      earliest.set(key, {
        ts,
        submissionId:   doc.id,
        userId:         d.userId,
        gameId:         d.gameId,
        correctCount:   d.correctCount ?? 0,
        totalQuestions: d.totalQuestions ?? 1,
        score:          d.score ?? 0,
        isFirstAttempt: d.isFirstAttempt ?? false,
      });
    }
  }

  const submissions = [...earliest.values()].sort((a, b) => a.ts - b.ts);
  console.log(`  ${submissions.length} unique (userId, gameId) pairs after dedup.`);
  return submissions;
}

// ---------------------------------------------------------------------------
// Phase 3: Replay in memory
// ---------------------------------------------------------------------------

function replayInMemory(submissions) {
  console.log("\n=== Phase 3: Replay ===");

  // userState[uid] = { bElo, contestsPlayed, lastContestAt }
  const userState = {};

  // blitzParticipants[gameId] = [ { ...sub } ]  (accumulates until activated)
  // blitzActivated[gameId]    = { Rc, activated: true }
  const blitzParticipants = {};
  const blitzActivated    = {};

  // Results to write back
  // submissionResults[submissionId] = { ratingDelta, newElo }
  const submissionResults = {};
  // finalUserState[uid] = { bElo, contestsPlayed, lastContestAt }
  const finalUserState = {};
  // ratingHistoryEntries[uid] = [ { newElo, delta, contestId, ts } ]
  const ratingHistoryEntries = {};
  // setResults[gameId] = { contestRating: Rc }
  const setResults = {};

  function getUser(uid) {
    if (!userState[uid]) userState[uid] = { bElo: 500, contestsPlayed: 0, lastContestAt: null };
    return userState[uid];
  }

  function computeRc(participants) {
    const P = participants.length;
    const Rbar = participants.reduce((s, p) => s + getUser(p.userId).bElo, 0) / P;
    const sbar = participants.reduce((s, p) => s + p.correctCount / Math.max(p.totalQuestions, 1), 0) / P;
    const delta = Math.max(0.01, Math.min(1.0, sbar));
    return Rbar * delta;
  }

  function assignRanksAndPercentiles(participants) {
    const sorted = [...participants].sort((a, b) => b.score - a.score);
    const P = participants.length;
    const rankMap  = {};
    const piMap    = {};
    sorted.forEach((p, i) => { rankMap[p.submissionId] = i + 1; });
    participants.forEach((p) => {
      const rankI  = rankMap[p.submissionId];
      const beaten = sorted.filter((_, i) => i + 1 > rankI).length;
      piMap[p.submissionId] = P > 1 ? beaten / (P - 1) : 1.0;
    });
    return { rankMap, piMap };
  }

  function applyDelta(uid, delta, gameId, ts) {
    const u = getUser(uid);
    const newElo = u.bElo + delta;
    u.bElo = newElo;
    u.contestsPlayed += 1;
    u.lastContestAt = new Date(ts);

    finalUserState[uid] = { ...u };

    if (!ratingHistoryEntries[uid]) ratingHistoryEntries[uid] = [];
    ratingHistoryEntries[uid].push({ newElo, delta, contestId: gameId, ts });
  }

  function activateBlitz(gameId, participants) {
    const Rc = computeRc(participants);
    blitzActivated[gameId] = { Rc };
    setResults[gameId] = { contestRating: Rc };

    const { rankMap, piMap } = assignRanksAndPercentiles(participants);

    for (const p of participants) {
      const u = getUser(p.userId);
      const Rp    = u.bElo;
      const pi    = piMap[p.submissionId];
      const piHat = computeExpectedPercentile(Rp, Rc);
      const Kp    = computeKFactor(Rp, Rc);
      const isFirst = rankMap[p.submissionId] === 1;

      const delta = computeFinalDelta(
        Rp, Rc, pi, piHat, Kp,
        u.contestsPlayed, u.lastContestAt,
        true, // early entry
        isFirst
      );
      const newElo = Rp + delta;

      submissionResults[p.submissionId] = { ratingDelta: delta, newElo };
      applyDelta(p.userId, delta, gameId, p.ts);
    }

    console.log(`  Activated ${gameId}: Rc=${Rc.toFixed(1)}, ${participants.length} participants.`);
  }

  function rateLatecomer(sub, Rc) {
    const gameId = sub.gameId;
    const participants = blitzParticipants[gameId] || [];

    // Re-rank among all previous + this submission
    const allSubs = [...participants, sub];
    const { rankMap, piMap } = assignRanksAndPercentiles(allSubs);

    const u = getUser(sub.userId);
    const Rp    = u.bElo;
    const pi    = piMap[sub.submissionId];
    const piHat = computeExpectedPercentile(Rp, Rc);
    const Kp    = computeKFactor(Rp, Rc);
    const isFirst = rankMap[sub.submissionId] === 1;

    const delta = computeFinalDelta(
      Rp, Rc, pi, piHat, Kp,
      u.contestsPlayed, u.lastContestAt,
      false, // not early entry
      isFirst
    );
    const newElo = Rp + delta;

    submissionResults[sub.submissionId] = { ratingDelta: delta, newElo };
    applyDelta(sub.userId, delta, gameId, sub.ts);

    // Keep participant list growing for accurate future rank calculations
    blitzParticipants[gameId].push(sub);
  }

  for (const sub of submissions) {
    const { gameId } = sub;

    if (!blitzParticipants[gameId]) blitzParticipants[gameId] = [];

    if (blitzActivated[gameId]) {
      // Contest already live — rate immediately
      rateLatecomer(sub, blitzActivated[gameId].Rc);
    } else {
      // Still accumulating toward threshold
      blitzParticipants[gameId].push(sub);

      if (blitzParticipants[gameId].length >= 25) {
        activateBlitz(gameId, blitzParticipants[gameId]);
      }
    }
  }

  const pendingBlitzes = Object.keys(blitzParticipants).filter((g) => !blitzActivated[g]);
  if (pendingBlitzes.length > 0) {
    console.log(`  ${pendingBlitzes.length} blitz(es) below threshold — no ratings applied.`);
  }

  console.log(
    `  Replay complete. ${Object.keys(submissionResults).length} submissions rated, ` +
    `${Object.keys(finalUserState).length} users updated.`
  );

  return { submissionResults, finalUserState, ratingHistoryEntries, setResults };
}

// ---------------------------------------------------------------------------
// Phase 4: Write
// ---------------------------------------------------------------------------

async function writeResults({ submissionResults, finalUserState, ratingHistoryEntries, setResults }) {
  console.log("\n=== Phase 4: Write ===");

  // User states
  console.log(`  Writing ${Object.keys(finalUserState).length} user states…`);
  const b1 = makeBatcher();
  for (const [uid, state] of Object.entries(finalUserState)) {
    b1.update(db.collection("users").doc(uid), {
      bElo: state.bElo,
      contestsPlayed: state.contestsPlayed,
      lastContestAt: state.lastContestAt,
    });
  }
  await b1.commit();

  // Rating history
  const totalHistory = Object.values(ratingHistoryEntries).reduce((s, a) => s + a.length, 0);
  console.log(`  Writing ${totalHistory} ratingHistory entries…`);
  const b2 = makeBatcher();
  for (const [uid, entries] of Object.entries(ratingHistoryEntries)) {
    for (const e of entries) {
      const ref = db.collection("users").doc(uid).collection("ratingHistory").doc();
      b2.set(ref, {
        newElo:    e.newElo,
        delta:     e.delta,
        contestId: e.contestId,
        timestamp: new Date(e.ts),
      });
    }
  }
  await b2.commit();

  // Submission ratingDelta + newElo
  console.log(`  Writing ${Object.keys(submissionResults).length} submission rating fields…`);
  const b3 = makeBatcher();
  for (const [subId, result] of Object.entries(submissionResults)) {
    b3.update(db.collection("gameSubmissions").doc(subId), result);
  }
  await b3.commit();

  // Set contestRating
  console.log(`  Writing ${Object.keys(setResults).length} set contestRating fields…`);
  const b4 = makeBatcher();
  for (const [gameId, data] of Object.entries(setResults)) {
    b4.set(db.collection("sets").doc(gameId), data, { merge: true });
  }
  await b4.commit();

  console.log("\nAll done.");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  try {
    await resetAll();
    const submissions = await loadSubmissions();
    const results = replayInMemory(submissions);
    await writeResults(results);
  } catch (err) {
    console.error("\nReplay failed:", err);
    process.exit(1);
  }
}

main();
