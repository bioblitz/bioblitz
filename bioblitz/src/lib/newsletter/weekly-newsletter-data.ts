import { adminFirestore } from "@/lib/firebase-admin";

//interfaces for various types of data
export interface NewsletterSet {
  id: string;
  title: string;
  topic: string;
  questionCount: number;
  timeLimit: number;
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
  isOpen: boolean;
  won?: boolean;
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
  username: string;
  email: string;

  blitzesTakenThisWeek: number;
  activePlayersThisWeek: number;
  newSetsThisWeek: number;

  blitzOfWeek: NewsletterSet | null;

  potd: NewsletterPotd | null;

  eloLeaderboard: NewsletterLeaderboardUser[];
  streakLeaderboard: NewsletterLeaderboardUser[];

  challenges: NewsletterChallenge[];
  hasChallenges: boolean;

  trendingSets: NewsletterSet[];

  studyTip: { title: string; body: string } | null;

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
  if (u.emailNotifications === false) return null; //we need to actually implement this, currently settings affects emailNotifications correctly but we need to update routes too

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateRange = `${fmtDate(weekAgo)} – ${fmtDate(now)}, ${now.getFullYear()}`;

  let blitzesTakenThisWeek = 0; //filters through gameSubmissions to get these stats, one issue is for each query, if the count is greater than 2000 it will not count beyond that bc of Firestore query limit
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

  let activePlayersThisWeek = 0;
  try {
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

    const potdDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      potdDates.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
    }

    for (const dateStr of potdDates.slice(0, 7)) {
      const potdUsersSnap = await db
        .collection("users")
        .where("completedPotdIds", "array-contains", dateStr)
        .limit(500)
        .get();
      for (const d of potdUsersSnap.docs) activeUids.add(d.id);
    }

    activePlayersThisWeek = activeUids.size; //total number of unique users who either played a blitz or completed the potd in the past week
  } catch (e) {
    console.error("newsletter: activePlayers error", e);
  }

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

  let blitzOfWeek: NewsletterSet | null = null; //fetch data for the biitz of the week if it's set, this is manually set in the newsletterConfig collection in Firestore
  if (blitzOfWeekId) {
    try {
      const snap = await db.collection("sets").doc(blitzOfWeekId).get();
      if (snap.exists) {
        const d = snap.data()!;
        blitzOfWeek = {
          id: snap.id,
          title: d.title || "",
          topic: d.topic || "",
          questionCount:
            d.questionCount || parseInt(d.number_of_questions) || 0,
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

  let potd: NewsletterPotd | null = null; //rn if there's no potd for today, then it will show yesterday's problem, and if that doesn't exist then the potd section will just be hidden
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

  const challenges: NewsletterChallenge[] = [];

  try {
    const openSnap = await db
      .collection("challenges")
      .where("challengedId", "==", uid)
      .where("status", "==", "pending")
      .get();

    for (const d of openSnap.docs) {
      const c = d.data();
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

    challenges.sort((a, b) => {
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    challenges.splice(5);
  } catch (e) {
    console.error("newsletter: challenges error", e);
  }

  const trendingSets: NewsletterSet[] = [];

  try {
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
      questionCount: d.questionCount || parseInt(d.number_of_questions) || 0,
      timeLimit: Math.round((parseInt(d.timeLimit) || 0) / 60),
      creatorUsername: d.creatorUsername || d.source || "",
      firstAttemptCount: d.firstAttemptCount || 0,
      averageRating: d.averageRating || 0,
      trendingScore: d.trendingScore || 0,
    });

    const newUnplayed = newSetsSnap.docs
      .filter(
        (d) =>
          !playedSet.has(d.id) &&
          d.data().hidden !== true &&
          d.data().status !== "incomplete" &&
          d.data().creator !== uid &&
          d.data().title,
      )
      .map((d) => toSet(d.data(), d.id));

    trendingSets.push(...newUnplayed.slice(0, 4));

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
            d.data().status !== "incomplete" &&
            d.data().creator !== uid &&
            d.data().title,
        )
        .map((d) => toSet(d.data(), d.id));

      trendingSets.push(...fallbacks.slice(0, 4 - trendingSets.length));
    }
  } catch (e) {
    console.error("newsletter: trendingSets error", e);
  }

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
