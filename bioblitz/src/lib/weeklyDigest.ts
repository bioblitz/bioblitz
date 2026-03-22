import { adminFirestore } from "./firebase-admin";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DigestData {
  userName: string;
  email: string;
  uid: string;
  elo: number;
  eloDelta: number;
  globalRank: number | null;
  weeklyBlitzes: number;
  weeklyQuestions: number;
  weeklyAccuracy: number;
  topicBreakdown: {
    topic: string;
    correct: number;
    total: number;
    accuracy: number;
  }[];
  challengeResults: { opponent: string; won: boolean; blitzTitle: string }[];
  lowScoreSet: { title: string; accuracy: number; gameId: string } | null;
  streak: number;
}

// ─── Email HTML ──────────────────────────────────────────────────────────────

export function buildDigestHtml(data: DigestData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 520px; margin: 0 auto; padding: 40px 16px;">

    <!-- Header Card -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 24px; margin-bottom: 12px; text-align: center;">
      <div style="width: 80px; height: 14px; background: #3f3f46; border-radius: 4px; margin: 0 auto 8px;"></div>
      <div style="width: 120px; height: 10px; background: #27272a; border-radius: 3px; margin: 0 auto;"></div>
    </div>

    <!-- Hero Card -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px 24px; margin-bottom: 12px; text-align: center;">
      <div style="width: 40px; height: 8px; background: #27272a; border-radius: 3px; margin: 0 auto 12px;"></div>
      <div style="width: 100px; height: 36px; background: #3f3f46; border-radius: 6px; margin: 0 auto 12px;"></div>
      <div style="width: 130px; height: 10px; background: #27272a; border-radius: 3px; margin: 0 auto 8px;"></div>
      <div style="width: 90px; height: 8px; background: #1c1c20; border-radius: 3px; margin: 0 auto;"></div>
    </div>

    <!-- Stats Row -->
    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
      <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px 12px; text-align: center;">
        <div style="width: 32px; height: 20px; background: #3f3f46; border-radius: 4px; margin: 0 auto 8px;"></div>
        <div style="width: 40px; height: 8px; background: #27272a; border-radius: 3px; margin: 0 auto;"></div>
      </div>
      <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px 12px; text-align: center;">
        <div style="width: 32px; height: 20px; background: #3f3f46; border-radius: 4px; margin: 0 auto 8px;"></div>
        <div style="width: 40px; height: 8px; background: #27272a; border-radius: 3px; margin: 0 auto;"></div>
      </div>
      <div style="flex: 1; background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px 12px; text-align: center;">
        <div style="width: 32px; height: 20px; background: #3f3f46; border-radius: 4px; margin: 0 auto 8px;"></div>
        <div style="width: 40px; height: 8px; background: #27272a; border-radius: 3px; margin: 0 auto;"></div>
      </div>
    </div>

    <!-- Table Card -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 12px;">
      <div style="width: 60px; height: 8px; background: #3f3f46; border-radius: 3px; margin-bottom: 16px;"></div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #1e1e22;">
        <div style="width: 100px; height: 10px; background: #27272a; border-radius: 3px;"></div>
        <div style="width: 36px; height: 10px; background: #3f3f46; border-radius: 3px;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #1e1e22;">
        <div style="width: 80px; height: 10px; background: #27272a; border-radius: 3px;"></div>
        <div style="width: 36px; height: 10px; background: #3f3f46; border-radius: 3px;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #1e1e22;">
        <div style="width: 110px; height: 10px; background: #27272a; border-radius: 3px;"></div>
        <div style="width: 36px; height: 10px; background: #3f3f46; border-radius: 3px;"></div>
      </div>
    </div>

    <!-- Second Table Card -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 12px;">
      <div style="width: 70px; height: 8px; background: #3f3f46; border-radius: 3px; margin-bottom: 16px;"></div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #1e1e22;">
        <div style="width: 90px; height: 10px; background: #27272a; border-radius: 3px;"></div>
        <div style="width: 20px; height: 10px; background: #3f3f46; border-radius: 3px;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #1e1e22;">
        <div style="width: 70px; height: 10px; background: #27272a; border-radius: 3px;"></div>
        <div style="width: 20px; height: 10px; background: #3f3f46; border-radius: 3px;"></div>
      </div>
    </div>

    <!-- Review Card -->
    <div style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; margin-bottom: 12px;">
      <div style="width: 50px; height: 8px; background: #3f3f46; border-radius: 3px; margin-bottom: 12px;"></div>
      <div style="width: 160px; height: 10px; background: #27272a; border-radius: 3px; margin-bottom: 8px;"></div>
      <div style="width: 60px; height: 10px; background: #3f3f46; border-radius: 3px; margin-bottom: 16px;"></div>
      <div style="width: 80px; height: 32px; background: #3f3f46; border-radius: 6px;"></div>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; width: 160px; height: 40px; background: #3f3f46; border-radius: 20px;"></div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #27272a;">
      <div style="width: 200px; height: 8px; background: #27272a; border-radius: 3px; margin: 0 auto;"></div>
    </div>

  </div>
</body>
</html>
  `;
}

function buildSubject(data: DigestData): string {
  const sign = data.eloDelta > 0 ? "+" : "";
  return `Elo ${data.elo} (${sign}${data.eloDelta}) · BioBlitz weekly`;
}

export async function buildDigestForUser(
  uid: string,
): Promise<DigestData | null> {
  const userDoc = await adminFirestore.collection("users").doc(uid).get();
  if (!userDoc.exists) return null;

  const userData = userDoc.data()!;
  const email = userData.email;
  if (!email) return null;

  if (userData.marketingConsent === false) return null;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const subsSnap = await adminFirestore
    .collection("gameSubmissions")
    .where("userId", "==", uid)
    .where("status", "==", "graded")
    .where("submittedAt", ">=", weekAgo)
    .get();

  const submissions = subsSnap.docs.map((d) => d.data());
  const rankedSubs = submissions.filter((s) => s.ranked === true);

  const weeklyBlitzes = rankedSubs.length;
  const weeklyQuestions = rankedSubs.reduce(
    (sum, s) => sum + (s.totalQuestions || 0),
    0,
  );
  const weeklyCorrect = rankedSubs.reduce(
    (sum, s) => sum + (s.correctCount || 0),
    0,
  );
  const weeklyAccuracy =
    weeklyQuestions > 0
      ? Math.round((weeklyCorrect / weeklyQuestions) * 100)
      : 0;

  const elo = userData.bElo || 0;
  const eloHistory: any[] = Array.isArray(userData.eloHistory)
    ? userData.eloHistory
    : [];
  const weekEloEntries = eloHistory.filter((e) => {
    const d = e.timestamp?.toDate
      ? e.timestamp.toDate()
      : new Date(e.timestamp);
    return d >= weekAgo;
  });
  const eloDelta = weekEloEntries.reduce(
    (sum: number, e: any) => sum + (e.delta || 0),
    0,
  );

  let globalRank: number | null = null;
  try {
    const rankSnap = await adminFirestore
      .collection("users")
      .orderBy("bElo", "desc")
      .limit(200)
      .get();
    let rank = 1;
    for (const d of rankSnap.docs) {
      if (d.id === uid) {
        globalRank = rank;
        break;
      }
      if ((d.data().bElo || 0) > elo) rank++;
      else break;
    }
  } catch {}

  const topicMap = new Map<string, { correct: number; total: number }>();
  const gameIds = [...new Set(rankedSubs.map((s) => s.gameId))];
  const gameTopics = new Map<string, string>();
  for (let i = 0; i < gameIds.length; i += 10) {
    const chunk = gameIds.slice(i, i + 10);
    await Promise.all(
      chunk.map(async (gid) => {
        try {
          const setDoc = await adminFirestore.collection("sets").doc(gid).get();
          if (setDoc.exists)
            gameTopics.set(gid, setDoc.data()?.topic || "General");
        } catch {}
      }),
    );
  }

  for (const sub of rankedSubs) {
    const topic = gameTopics.get(sub.gameId) || "General";
    const existing = topicMap.get(topic) || { correct: 0, total: 0 };
    existing.correct += sub.correctCount || 0;
    existing.total += sub.totalQuestions || 0;
    topicMap.set(topic, existing);
  }

  const topicBreakdown = Array.from(topicMap.entries())
    .map(([topic, d]) => ({
      topic,
      correct: d.correct,
      total: d.total,
      accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const challengeResults: DigestData["challengeResults"] = [];
  try {
    const challengerSnap = await adminFirestore
      .collection("challenges")
      .where("challengerId", "==", uid)
      .where("status", "==", "completed")
      .where("completedAt", ">=", weekAgo)
      .get();

    const challengedSnap = await adminFirestore
      .collection("challenges")
      .where("challengedId", "==", uid)
      .where("status", "==", "completed")
      .where("completedAt", ">=", weekAgo)
      .get();

    const allChallenges = [...challengerSnap.docs, ...challengedSnap.docs].map(
      (d) => d.data(),
    );

    for (const c of allChallenges) {
      const isChallenger = c.challengerId === uid;
      const opponentId = isChallenger ? c.challengedId : c.challengerId;
      const myScore = isChallenger ? c.challengerScore : c.challengedScore;
      const theirScore = isChallenger ? c.challengedScore : c.challengerScore;

      let opponentName = "Unknown";
      try {
        const oppDoc = await adminFirestore
          .collection("users")
          .doc(opponentId)
          .get();
        if (oppDoc.exists)
          opponentName =
            oppDoc.data()?.displayName || oppDoc.data()?.username || "Unknown";
      } catch {}

      challengeResults.push({
        opponent: opponentName,
        won: myScore > theirScore,
        blitzTitle: c.blitzTitle || "Blitz",
      });
    }
  } catch {}

  let lowScoreSet: DigestData["lowScoreSet"] = null;
  const sortedByAccuracy = rankedSubs
    .filter((s) => s.totalQuestions > 0)
    .map((s) => ({
      gameId: s.gameId,
      accuracy: (s.correctCount / s.totalQuestions) * 100,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  if (sortedByAccuracy.length > 0 && sortedByAccuracy[0].accuracy < 70) {
    const worst = sortedByAccuracy[0];
    const setDoc = await adminFirestore
      .collection("sets")
      .doc(worst.gameId)
      .get();
    lowScoreSet = {
      title: setDoc.exists
        ? setDoc.data()?.title || "Unknown Blitz"
        : "Unknown Blitz",
      accuracy: worst.accuracy,
      gameId: worst.gameId,
    };
  }

  return {
    userName: userData.displayName || userData.username || "there",
    email,
    uid,
    elo,
    eloDelta,
    globalRank,
    weeklyBlitzes,
    weeklyQuestions,
    weeklyAccuracy,
    topicBreakdown,
    challengeResults,
    lowScoreSet,
    streak: userData.streak || 0,
  };
}

export async function sendWeeklyDigest(
  uid: string,
): Promise<{ success: boolean; skipped?: string }> {
  const data = await buildDigestForUser(uid);

  if (!data) return { success: false, skipped: "No data or opted out" };

  if (data.weeklyBlitzes === 0 && data.challengeResults.length === 0) {
    return { success: false, skipped: "No activity this week" };
  }

  const subject = buildSubject(data);
  const html = buildDigestHtml(data);

  try {
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"BioBlitz" <${process.env.EMAIL_USER}>`,
      to: data.email,
      subject,
      html,
    });

    return { success: true };
  } catch (err) {
    console.error(`Failed to send digest to ${data.email}:`, err);
    return { success: false };
  }
}
