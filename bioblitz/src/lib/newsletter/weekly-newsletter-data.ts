import { adminFirestore } from "@/lib/firebase-admin";

export interface NewsletterSet {
  id: string;
  title: string;
  topic: string;
  questionCount: number;
  timeLimit: number; // minutes
  creatorUsername: string;
  firstAttemptCount: number;
  averageRating: number;
  trendingScore: number;
}

export interface NewsletterChallenge {
  id: string;
  opponentUsername: string;
  blitzTitle: string;
  topic: string;
  questionCount: number;
  isOpen: boolean; // true = pending, false = completed this week
  won?: boolean; // only for completed
  myScore?: number;
  theirScore?: number;
  createdAt: Date;
}

export interface NewsletterLeaderboardUser {
  uid: string;
  username: string;
  photoURL: string;
  bElo: number;
  streak: number;
  school?: string;
  blitzesThisWeek?: number;
  accuracy?: number;
}

export interface NewsletterPotd {
  number: string;
  title: string;
  topic: string;
  date: string;
  multiSelect: boolean;
}

export interface NewsletterData {
  // User
  username: string;
  email: string;

  // Platform stats
  blitzesTakenThisWeek: number;
  activePlayersThisWeek: number;
  newSetsThisWeek: number;

  // Blitz of the week (manual)
  blitzOfWeek: NewsletterSet | null;

  // POTD
  potd: NewsletterPotd | null;

  // Leaderboards
  eloLeaderboard: NewsletterLeaderboardUser[];
  streakLeaderboard: NewsletterLeaderboardUser[];

  // Challenges
  challenges: NewsletterChallenge[];
  hasChallenges: boolean;

  // Trending / unplayed sets (4 cards)
  trendingSets: NewsletterSet[];

  // Study tip (manual)
  studyTip: { title: string; body: string } | null;

  // Issue metadata
  issueNumber: number;
  dateRange: string;
}

export async function gatherNewsletterData(
  uid: string,
  issueNumber: number,
  blitzOfWeekId?: string,
  studyTipTitle?: string,
  studyTipBody?: string,
): Promise<NewsletterData | null> {
  const db = adminFirestore;

  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) return null;

  const u = userSnap.data()!;
  console.log("newsletter debug:", {
    uid,
    exists: userSnap.exists,
    email: u.email,
    emailNotifications: u.emailNotifications,
    username: u.username,
  });

  const username: string = u.username || "";
  const email: string = u.email || "";
  const playedGameIds: string[] = u.playedGameIds || [];
  const playedSet = new Set(playedGameIds);
  const completedPotdIds: string[] = u.completedPotdIds || [];

  if (!email) return null;
  if (u.emailNotifications === false) return null;

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Date range string e.g. "Mar 24 – Mar 30, 2026"
  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateRange = `${fmtDate(weekAgo)} – ${fmtDate(now)}, ${now.getFullYear()}`;

  // ── Platform stats ──────────────────────────────────────────────────────────

  // Blitzes taken this week: sum firstAttemptCount from ranked submissions this week
  let blitzesTakenThisWeek = 0;
  try {
    const subsSnap = await db
      .collection("gameSubmissions")
      .where("status", "==", "graded")
      .where("ranked", "==", true)
      .where("submittedAt", ">=", weekAgo)
      .limit(2000)
      .get();
    blitzesTakenThisWeek = subsSnap.size;
  } catch (e) {
    console.error("newsletter: blitzesTaken error", e);
  }

  // Active players: users with a ranked submission OR POTD completion this week
  let activePlayersThisWeek = 0;
  try {
    // Get unique userIds from submissions this week
    const subsSnap = await db
      .collection("gameSubmissions")
      .where("status", "==", "graded")
      .where("submittedAt", ">=", weekAgo)
      .limit(2000)
      .get();

    const activeUids = new Set<string>();
    for (const d of subsSnap.docs) {
      const userId = d.data().userId;
      if (userId) activeUids.add(userId);
    }

    // Also count users who completed POTD this week
    const potdDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      potdDates.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
    }

    // Sample users who have completedPotdIds containing any of this week's dates
    // (Firestore doesn't support array-contains-any with multiple values efficiently,
    //  so we check one date at a time for the most recent 3 days as a proxy)
    for (const dateStr of potdDates.slice(0, 3)) {
      const potdUsersSnap = await db
        .collection("users")
        .where("completedPotdIds", "array-contains", dateStr)
        .limit(500)
        .get();
      for (const d of potdUsersSnap.docs) activeUids.add(d.id);
    }

    activePlayersThisWeek = activeUids.size;
  } catch (e) {
    console.error("newsletter: activePlayers error", e);
  }

  // New sets this week: activatedAt >= weekAgo
  let newSetsThisWeek = 0;
  try {
    const newSetsSnap = await db
      .collection("sets")
      .where("activatedAt", ">=", weekAgo)
      .get();
    newSetsThisWeek = newSetsSnap.size;
  } catch (e) {
    console.error("newsletter: newSets error", e);
  }

  // ── Blitz of the week (manual) ──────────────────────────────────────────────
  let blitzOfWeek: NewsletterSet | null = null;
  if (blitzOfWeekId) {
    try {
      const snap = await db.collection("sets").doc(blitzOfWeekId).get();
      if (snap.exists) {
        const d = snap.data()!;
        blitzOfWeek = {
          id: snap.id,
          title: d.title || "",
          topic: d.topic || "",
          questionCount: d.questionCount || 0,
          timeLimit: Math.round((parseInt(d.timeLimit) || 0) / 60),
          creatorUsername: d.creatorUsername || "",
          firstAttemptCount: d.firstAttemptCount || 0,
          averageRating: d.averageRating || 0,
          trendingScore: d.trendingScore || 0,
        };
      }
    } catch (e) {
      console.error("newsletter: blitzOfWeek error", e);
    }
  }

  // ── POTD ────────────────────────────────────────────────────────────────────
  let potd: NewsletterPotd | null = null;
  try {
    const toDocDate = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    const today = toDocDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const dateStr of [today, toDocDate(yesterday)]) {
      const snap = await db.collection("potd").doc(dateStr).get();
      if (snap.exists) {
        const d = snap.data()!;
        potd = {
          number: d.number || dateStr,
          title: d.title || "Today's Problem",
          topic: d.topic || "",
          date: dateStr,
          multiSelect: d.multiSelect === true,
        };
        break;
      }
    }
  } catch (e) {
    console.error("newsletter: potd error", e);
  }

  // ── Leaderboards ────────────────────────────────────────────────────────────
  let eloLeaderboard: NewsletterLeaderboardUser[] = [];
  let streakLeaderboard: NewsletterLeaderboardUser[] = [];

  try {
    const [eloSnap, streakSnap] = await Promise.all([
      db.collection("users").orderBy("bElo", "desc").limit(3).get(),
      db.collection("users").orderBy("streak", "desc").limit(3).get(),
    ]);

    const toUser = (d: any, id: string): NewsletterLeaderboardUser => ({
      uid: id,
      username: d.username || "",
      photoURL: d.photoURL || "",
      bElo: d.bElo || 0,
      streak: d.streak || 0,
      school: d.school || "",
    });

    eloLeaderboard = eloSnap.docs.map((d) => toUser(d.data(), d.id));
    streakLeaderboard = streakSnap.docs.map((d) => toUser(d.data(), d.id));
  } catch (e) {
    console.error("newsletter: leaderboard error", e);
  }

  // ── Challenges ──────────────────────────────────────────────────────────────
  const challenges: NewsletterChallenge[] = [];

  try {
    // Open challenges (pending, not expired)
    const openSnap = await db
      .collection("challenges")
      .where("challengedId", "==", uid)
      .where("status", "==", "pending")
      .get();

    for (const d of openSnap.docs) {
      const c = d.data();
      // Skip expired
      if (c.expiresAt && toDate(c.expiresAt) && toDate(c.expiresAt)! < now)
        continue;
      challenges.push({
        id: d.id,
        opponentUsername: c.challengerUsername || "Unknown",
        blitzTitle: c.blitzTitle || "",
        topic: "",
        questionCount: 0,
        isOpen: true,
        createdAt: toDate(c.createdAt) || now,
      });
    }

    // Also completed challenges this week
    const completedSnap = await db
      .collection("challenges")
      .where("challengerId", "==", uid)
      .where("status", "==", "completed")
      .where("resolvedAt", ">=", weekAgo)
      .get();

    const completedSnap2 = await db
      .collection("challenges")
      .where("challengedId", "==", uid)
      .where("status", "==", "completed")
      .where("resolvedAt", ">=", weekAgo)
      .get();

    const completedDocs = [...completedSnap.docs, ...completedSnap2.docs];
    for (const d of completedDocs) {
      const c = d.data();
      const isChallenger = c.challengerId === uid;
      const myScore = isChallenger ? c.challengerScore : c.challengedScore;
      const theirScore = isChallenger ? c.challengedScore : c.challengerScore;
      const opponentUsername = isChallenger
        ? c.challengedUsername
        : c.challengerUsername;
      challenges.push({
        id: d.id,
        opponentUsername: opponentUsername || "Unknown",
        blitzTitle: c.blitzTitle || "",
        topic: "",
        questionCount: 0,
        isOpen: false,
        won: c.winnerId === uid,
        myScore: myScore ?? 0,
        theirScore: theirScore ?? 0,
        createdAt: toDate(c.resolvedAt) || now,
      });
    }

    // Sort: open first, then by date desc, cap at 5
    challenges.sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    challenges.splice(5);
  } catch (e) {
    console.error("newsletter: challenges error", e);
  }

  // ── Trending / unplayed sets ────────────────────────────────────────────────
  const trendingSets: NewsletterSet[] = [];

  try {
    // Try new sets this week first
    const newSetsSnap = await db
      .collection("sets")
      .where("activatedAt", ">=", weekAgo)
      .where("firstAttemptCount", ">=", 1)
      .orderBy("activatedAt", "desc")
      .limit(20)
      .get();

    const toSet = (d: any, id: string): NewsletterSet => ({
      id,
      title: d.title || "",
      topic: d.topic || "",
      questionCount: d.questionCount || 0,
      timeLimit: Math.round((parseInt(d.timeLimit) || 0) / 60),
      creatorUsername: d.creatorUsername || "",
      firstAttemptCount: d.firstAttemptCount || 0,
      averageRating: d.averageRating || 0,
      trendingScore: d.trendingScore || 0,
    });

    const newUnplayed = newSetsSnap.docs
      .filter(
        (d) =>
          !playedSet.has(d.id) &&
          d.data().hidden !== true &&
          d.data().creator !== uid &&
          d.data().title,
      )
      .map((d) => toSet(d.data(), d.id));

    trendingSets.push(...newUnplayed.slice(0, 4));

    // Pad with unplayed trending sets if not enough new ones
    if (trendingSets.length < 4) {
      const fallbackSnap = await db
        .collection("sets")
        .where("firstAttemptCount", ">=", 1)
        .orderBy("trendingScore", "desc")
        .limit(50)
        .get();

      const existingIds = new Set(trendingSets.map((s) => s.id));
      const fallbacks = fallbackSnap.docs
        .filter(
          (d) =>
            !playedSet.has(d.id) &&
            !existingIds.has(d.id) &&
            d.data().hidden !== true &&
            d.data().creator !== uid &&
            d.data().title,
        )
        .map((d) => toSet(d.data(), d.id));

      trendingSets.push(...fallbacks.slice(0, 4 - trendingSets.length));
    }
  } catch (e) {
    console.error("newsletter: trendingSets error", e);
  }

  // ── Study tip ───────────────────────────────────────────────────────────────
  const studyTip =
    studyTipTitle && studyTipBody
      ? { title: studyTipTitle, body: studyTipBody }
      : null;

  return {
    username,
    email,
    blitzesTakenThisWeek,
    activePlayersThisWeek,
    newSetsThisWeek,
    blitzOfWeek,
    potd,
    eloLeaderboard,
    streakLeaderboard,
    challenges,
    hasChallenges: challenges.length > 0,
    trendingSets,
    studyTip,
    issueNumber,
    dateRange,
  };
}

function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts._seconds) return new Date(ts._seconds * 1000);
  if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
  return null;
}
