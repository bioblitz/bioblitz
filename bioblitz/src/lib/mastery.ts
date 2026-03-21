// src/lib/mastery.ts

export interface Submission {
  gameId: string;
  topic: string;
  correctCount: number;
  totalQuestions: number;
  submittedAt: number; // ms
  score: number;
}

export interface TopicMastery {
  topic: string;
  masteryScore: number; // recency-weighted 0–100
  rawAccuracy: number; // simple % across all attempts
  recentAccuracy: number; // last 5 attempts
  previousAccuracy: number; // prior 5 attempts
  trend: number; // recentAccuracy - previousAccuracy
  attempts: number;
  submissions: Submission[];
}

const HALF_LIFE_DAYS = 30;

function decayWeight(submittedAt: number): number {
  const ageDays = (Date.now() - submittedAt) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export function computeTopicMastery(submissions: Submission[]): TopicMastery[] {
  const byTopic = new Map<string, Submission[]>();

  for (const s of submissions) {
    if (!byTopic.has(s.topic)) byTopic.set(s.topic, []);
    byTopic.get(s.topic)!.push(s);
  }

  const results: TopicMastery[] = [];

  for (const [topic, subs] of byTopic) {
    const sorted = [...subs].sort((a, b) => a.submittedAt - b.submittedAt);

    // Recency-weighted mastery
    let weightedSum = 0;
    let weightTotal = 0;
    for (const s of sorted) {
      if (s.totalQuestions === 0) continue;
      const acc = s.correctCount / s.totalQuestions;
      const w = decayWeight(s.submittedAt);
      weightedSum += acc * w;
      weightTotal += w;
    }
    const masteryScore =
      weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) : 0;

    // Raw accuracy
    const totalCorrect = sorted.reduce((s, x) => s + x.correctCount, 0);
    const totalQ = sorted.reduce((s, x) => s + x.totalQuestions, 0);
    const rawAccuracy =
      totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

    // Recent vs previous 5
    const recent5 = sorted.slice(-5);
    const prev5 = sorted.slice(-10, -5);

    const acc5 = (arr: Submission[]) => {
      const c = arr.reduce((s, x) => s + x.correctCount, 0);
      const t = arr.reduce((s, x) => s + x.totalQuestions, 0);
      return t > 0 ? Math.round((c / t) * 100) : 0;
    };

    const recentAccuracy = acc5(recent5);
    const previousAccuracy = acc5(prev5);
    const trend = prev5.length > 0 ? recentAccuracy - previousAccuracy : 0;

    results.push({
      topic,
      masteryScore,
      rawAccuracy,
      recentAccuracy,
      previousAccuracy,
      trend,
      attempts: sorted.length,
      submissions: sorted.reverse(), // newest first for display
    });
  }

  // Sort weakest → strongest
  return results.sort((a, b) => a.masteryScore - b.masteryScore);
}

export interface TimeSeriesPoint {
  date: string;
  accuracy: number;
}

export function buildTopicTimeSeries(
  submissions: Submission[],
  topic: string,
): TimeSeriesPoint[] {
  return submissions
    .filter((s) => s.topic === topic && s.totalQuestions > 0)
    .sort((a, b) => a.submittedAt - b.submittedAt)
    .map((s) => ({
      date: new Date(s.submittedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      accuracy: Math.round((s.correctCount / s.totalQuestions) * 100),
    }));
}
