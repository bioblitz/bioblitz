import { adminFirestore } from "@/lib/firebase-admin";

export interface FriendDigest {
  displayName: string;
  username: string;
  bElo: number;
}

export interface UnplayedBlitz {
  id: string;
  title: string;
  topic: string;
  questionCount: number;
}

export interface WeeklyDigestData {
  displayName: string;
  username: string;
  email: string;

  currentElo: number;
  eloChange: number;
  globalRank: number | null;

  currentStreak: number;
  blitzesThisWeek: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;

  activeDays: boolean[];

  potdCompletedThisWeek: number;
  potdAvailableThisWeek: number;

  challengeWins: number;
  challengeLosses: number;

  friends: FriendDigest[];
  friendAhead: { displayName: string; gap: number } | null;

  unplayedBlitzes: UnplayedBlitz[];

  personalBest: { title: string; accuracy: number } | null;
  weakestTopicName: string | null;
}

export async function gatherWeeklyDigest(
  uid: string,
): Promise<WeeklyDigestData | null> {
  const db = adminFirestore;

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return null;

  const u = userSnap.data()!;
  const displayName: string = u.displayName || "there";
  const username: string = u.username || "";
  const email: string = u.email || "";
  const currentElo: number = u.bElo || 0;
  const currentStreak: number = u.streak || 0;
  const eloHistory: any[] = Array.isArray(u.eloHistory) ? u.eloHistory : [];
  const playedGameIds: string[] = u.playedGameIds || [];
  const playedSet = new Set(playedGameIds);

  if (!email) return null;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  let eloChange = 0;
  for (const entry of eloHistory) {
    const ts = toDate(entry.timestamp);
    if (ts && ts >= weekAgo && typeof entry.delta === "number") {
      eloChange += entry.delta;
    }
  }

  const subsSnap = await db
    .collection("gameSubmissions")
    .where("userId", "==", uid)
    .where("status", "==", "graded")
    .where("submittedAt", ">=", weekAgo)
    .orderBy("submittedAt", "desc")
    .limit(200)
    .get();

  const allSubs = subsSnap.docs.map((d) => d.data());
  const rankedSubs = allSubs.filter((s) => s.ranked);

  const blitzesThisWeek = rankedSubs.length;
  const questionsAnswered = rankedSubs.reduce(
    (sum, s) => sum + (s.totalQuestions || 0),
    0,
  );
  const correctAnswers = rankedSubs.reduce(
    (sum, s) => sum + (s.correctCount || 0),
    0,
  );
  const accuracy =
    questionsAnswered > 0
      ? Math.round((correctAnswers / questionsAnswered) * 100)
      : 0;

  const activeDays: boolean[] = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ];
  for (const sub of allSubs) {
    const ts = toDate(sub.submittedAt);
    if (!ts) continue;
    const jsDay = ts.getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    activeDays[idx] = true;
  }

  let personalBest: WeeklyDigestData["personalBest"] = null;
  if (rankedSubs.length > 0) {
    const best = rankedSubs.reduce((a, b) => {
      const aAcc = (a.correctCount || 0) / (a.totalQuestions || 1);
      const bAcc = (b.correctCount || 0) / (b.totalQuestions || 1);
      return bAcc > aAcc ? b : a;
    });
    const bestAcc = Math.round(
      ((best.correctCount || 0) / (best.totalQuestions || 1)) * 100,
    );
    if (bestAcc >= 70) {
      personalBest = {
        title: best.gameTitle || "a Blitz",
        accuracy: bestAcc,
      };
    }
  }

  let globalRank: number | null = null;
  try {
    const rankSnap = await db
      .collection("users")
      .orderBy("bElo", "desc")
      .limit(500)
      .get();

    let rank = 0;
    for (const d of rankSnap.docs) {
      rank++;
      if (d.id === uid) {
        globalRank = rank;
        break;
      }
    }
  } catch {}

  let potdCompletedThisWeek = 0;
  let potdAvailableThisWeek = 0;
  try {
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const potdSnap = await db
      .collection("potd")
      .where("date", ">=", weekAgoStr)
      .get();

    potdAvailableThisWeek = potdSnap.size;

    const completedIds: string[] = u.completedPotdIds || [];
    const weekPotdIds = new Set(potdSnap.docs.map((d) => d.id));
    potdCompletedThisWeek = completedIds.filter((id) =>
      weekPotdIds.has(id),
    ).length;
  } catch {}

  let challengeWins = 0;
  let challengeLosses = 0;
  try {
    const countChallenges = async (field: string) => {
      const snap = await db
        .collection("challenges")
        .where(field, "==", uid)
        .where("status", "==", "completed")
        .get();

      for (const d of snap.docs) {
        const data = d.data();
        const completedAt = toDate(data.completedAt);
        if (!completedAt || completedAt < weekAgo) continue;
        if (data.winnerId === uid) challengeWins++;
        else challengeLosses++;
      }
    };

    await Promise.all([
      countChallenges("challengerId"),
      countChallenges("challengedId"),
    ]);
  } catch {}

  const friends: FriendDigest[] = [];
  let friendAhead: WeeklyDigestData["friendAhead"] = null;
  try {
    const friendsSnap = await db
      .collection("users")
      .doc(uid)
      .collection("friends")
      .where("status", "==", "friends")
      .get();

    const friendUids = friendsSnap.docs
      .map((d) => (d.data() as any).uid)
      .filter(Boolean);

    const allUids = [uid, ...friendUids];

    const profiles = await Promise.all(
      allUids.map(async (fuid) => {
        try {
          const snap = await db.collection("users").doc(fuid).get();
          if (!snap.exists) return null;
          const d = snap.data() as any;
          return {
            uid: fuid,
            displayName: d.displayName || "Unknown",
            username: d.username || "",
            bElo: d.bElo || 0,
          };
        } catch {
          return null;
        }
      }),
    );

    const validProfiles = profiles.filter(Boolean) as (FriendDigest & {
      uid: string;
    })[];
    validProfiles.sort((a, b) => b.bElo - a.bElo);

    for (const p of validProfiles) {
      friends.push({
        displayName: p.displayName,
        username: p.username,
        bElo: p.bElo,
      });
    }

    const myIndex = validProfiles.findIndex((p) => p.uid === uid);
    if (myIndex > 0) {
      const ahead = validProfiles[myIndex - 1];
      friendAhead = {
        displayName: ahead.displayName,
        gap: ahead.bElo - currentElo,
      };
    }
  } catch {}

  let weakestTopicName: string | null = null;
  const unplayedBlitzes: UnplayedBlitz[] = [];

  try {
    const allRankedSnap = await db
      .collection("gameSubmissions")
      .where("userId", "==", uid)
      .where("status", "==", "graded")
      .where("ranked", "==", true)
      .orderBy("submittedAt", "desc")
      .limit(500)
      .get();

    const gameIds = [
      ...new Set(allRankedSnap.docs.map((d) => d.data().gameId)),
    ];
    const topicByGame = new Map<string, string>();

    if (gameIds.length > 0) {
      const gameRefs = gameIds.map((id) => db.collection("sets").doc(id));
      const gameDocs = await db.getAll(...gameRefs);
      for (const gd of gameDocs) {
        if (gd.exists) {
          topicByGame.set(gd.id, gd.data()?.topic || "General");
        }
      }
    }

    const stats = new Map<string, { correct: number; total: number }>();
    for (const d of allRankedSnap.docs) {
      const s = d.data();
      const topic = topicByGame.get(s.gameId) || "General";
      const cur = stats.get(topic) || { correct: 0, total: 0 };
      cur.correct += s.correctCount || 0;
      cur.total += s.totalQuestions || 0;
      stats.set(topic, cur);
    }

    let worstAcc = Infinity;
    for (const [topic, s] of stats) {
      if (s.total < 5) continue;
      const acc = (s.correct / s.total) * 100;
      if (acc < worstAcc) {
        worstAcc = acc;
        weakestTopicName = topic;
      }
    }

    const setsSnap = await db
      .collection("sets")
      .where("status", "==", "completed")
      .limit(200)
      .get();

    const candidates: UnplayedBlitz[] = [];
    for (const d of setsSnap.docs) {
      if (playedSet.has(d.id)) continue;
      const data = d.data();
      if (data.hidden) continue;
      candidates.push({
        id: d.id,
        title: data.title || "Untitled",
        topic: data.topic || "General",
        questionCount: data.number_of_questions || data.questions?.length || 0,
      });
    }

    candidates.sort((a, b) => {
      const aWeak = a.topic === weakestTopicName ? 0 : 1;
      const bWeak = b.topic === weakestTopicName ? 0 : 1;
      return aWeak - bWeak;
    });

    unplayedBlitzes.push(...candidates.slice(0, 5));
  } catch {}

  return {
    displayName,
    username,
    email,
    currentElo,
    eloChange,
    globalRank,
    currentStreak,
    blitzesThisWeek,
    questionsAnswered,
    correctAnswers,
    accuracy,
    activeDays,
    potdCompletedThisWeek,
    potdAvailableThisWeek,
    challengeWins,
    challengeLosses,
    friends,
    friendAhead,
    unplayedBlitzes,
    personalBest,
    weakestTopicName,
  };
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts._seconds) return new Date(ts._seconds * 1000);
  if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
  return null;
}
