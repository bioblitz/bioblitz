import { gameRoom } from "@/types";

type PageRankInput = {
  games: gameRoom[];
  playedGameIds: Set<string>;
  damping?: number;
  iterations?: number;
  maxNeighbors?: number;
};

export type RankedGame = {
  game: gameRoom;
  pageRankScore: number;
  finalScore: number;
};

const DEFAULT_DAMPING = 0.85;
const DEFAULT_ITERATIONS = 24;
const DEFAULT_MAX_NEIGHBORS = 14;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTopic(topic?: string): string {
  return (topic || "general").trim().toLowerCase();
}

function isOfficialGame(game: gameRoom): boolean {
  return Boolean(game.source) || !game.creator;
}

function difficultyToBucket(difficulty?: string): number {
  const value = (difficulty || "").toLowerCase();

  if (value.includes("easy") || value.includes("beginner")) return 1;
  if (value.includes("medium") || value.includes("intermediate")) return 2;
  if (value.includes("hard") || value.includes("advanced")) return 3;
  if (value.includes("expert") || value.includes("insane")) return 4;

  const parsed = Number.parseFloat(value);
  if (Number.isFinite(parsed)) {
    if (parsed <= 1.5) return 1;
    if (parsed <= 2.5) return 2;
    if (parsed <= 3.5) return 3;
    return 4;
  }

  return 2;
}

function normalize(values: number[]): number[] {
  const sum = values.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    const fallback = 1 / Math.max(values.length, 1);
    return values.map(() => fallback);
  }
  return values.map((value) => value / sum);
}

function normalizeRow(row: number[], selfIndex: number): number[] {
  const sum = row.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    const fallback = 1 / Math.max(row.length - 1, 1);
    return row.map((_, idx) => (idx === selfIndex ? 0 : fallback));
  }
  return row.map((value) => value / sum);
}

function difficultyFitScore(game: gameRoom, preferredDifficulty: number): number {
  const gap = Math.abs(difficultyToBucket(game.difficulty) - preferredDifficulty);
  return clamp(1 - gap / 3, 0.1, 1);
}

function starRatingScore(game: gameRoom): number {
  const stars = clamp(safeNumber(game.rating, 0), 0, 5);
  const ratingCount = Math.max(0, safeNumber(game.ratingCount, 0));
  const confidence = clamp(Math.log10(ratingCount + 1) / 2, 0.15, 1);
  return (stars / 5) * confidence;
}

function contestRatingScore(game: gameRoom): number {
  const raw = safeNumber(game.contestRating, 0);
  if (raw <= 0) return 0.2;

  // Map contest ratings around 1200-2200 into [0, 1].
  const normalized = 1 / (1 + Math.exp(-(raw - 1500) / 300));
  return clamp(normalized, 0.05, 1);
}

function qualityScore(game: gameRoom): number {
  const stars = starRatingScore(game);
  const contest = contestRatingScore(game);
  const trending = clamp(safeNumber(game.trendingScore, 0) / 100, 0, 1);

  return 0.5 * stars + 0.3 * contest + 0.2 * trending;
}

function estimatePreferredDifficulty(games: gameRoom[], playedGameIds: Set<string>): number {
  const buckets = games
    .filter((game) => playedGameIds.has(game.id))
    .map((game) => difficultyToBucket(game.difficulty));

  if (buckets.length === 0) return 2;
  const avg = buckets.reduce((acc, value) => acc + value, 0) / buckets.length;
  return clamp(avg, 1, 4);
}

function estimateOfficialAffinity(games: gameRoom[], playedGameIds: Set<string>): number {
  const played = games.filter((game) => playedGameIds.has(game.id));
  if (played.length === 0) return 0.5;

  const officialCount = played.filter((game) => isOfficialGame(game)).length;
  return officialCount / played.length;
}

function explorationPressure(games: gameRoom[], playedGameIds: Set<string>): number {
  if (games.length === 0) return 0.5;
  const completedRatio = playedGameIds.size / games.length;
  return clamp(0.35 + completedRatio * 0.65, 0.35, 1);
}

function computeTopicAffinity(games: gameRoom[], playedGameIds: Set<string>): Map<string, number> {
  const counts = new Map<string, number>();
  let total = 0;

  for (const game of games) {
    if (!playedGameIds.has(game.id)) continue;
    const topic = normalizeTopic(game.topic);
    counts.set(topic, (counts.get(topic) || 0) + 1);
    total += 1;
  }

  if (total === 0) return counts;

  for (const [topic, count] of counts.entries()) {
    counts.set(topic, count / total);
  }

  return counts;
}

function recencyFreshness(lastPlayedAt?: number | null): number {
  if (!lastPlayedAt) return 0.3;

  const now = Date.now();
  const ageMs = Math.max(now - lastPlayedAt, 0);
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (ageMs <= sevenDaysMs) return 1;
  if (ageMs <= sevenDaysMs * 3) return 0.65;
  return 0.35;
}

function buildTeleport(
  games: gameRoom[],
  playedGameIds: Set<string>,
  topicAffinity: Map<string, number>,
  preferredDifficulty: number,
  officialAffinity: number,
  explore: number,
): number[] {
  const raw = games.map((game) => {
    const topic = normalizeTopic(game.topic);
    const affinity = topicAffinity.get(topic) || 0;
    const unplayedBoost = playedGameIds.has(game.id) ? 0.12 : 1.85 + 0.45 * explore;
    const freshnessBoost = recencyFreshness(game.lastPlayedAt);
    const diffFit = difficultyFitScore(game, preferredDifficulty);
    const quality = qualityScore(game);
    const officialBoost = isOfficialGame(game) ? officialAffinity : 1 - officialAffinity;

    return (
      0.4 +
      unplayedBoost +
      affinity * 2.1 +
      diffFit * 1.3 +
      quality * 1.8 +
      freshnessBoost +
      officialBoost * 0.55
    );
  });

  return normalize(raw);
}

function transitionWeight(
  fromGame: gameRoom,
  toGame: gameRoom,
  playedGameIds: Set<string>,
  topicAffinity: Map<string, number>,
  preferredDifficulty: number,
  officialAffinity: number,
  explore: number,
): number {
  if (fromGame.id === toGame.id) return 0;

  const fromTopic = normalizeTopic(fromGame.topic);
  const toTopic = normalizeTopic(toGame.topic);
  const sameTopic = fromTopic === toTopic;
  const difficultyGap = Math.abs(
    difficultyToBucket(fromGame.difficulty) - difficultyToBucket(toGame.difficulty),
  );
  const topicPreference = topicAffinity.get(toTopic) || 0;
  const difficultyPreference = difficultyFitScore(toGame, preferredDifficulty);
  const sourcePreference = isOfficialGame(toGame) ? officialAffinity : 1 - officialAffinity;
  const starQuality = starRatingScore(toGame);
  const contestQuality = contestRatingScore(toGame);
  const popularity = safeNumber(toGame.trendingScore, 0) * 0.01;
  const freshness = recencyFreshness(toGame.lastPlayedAt);

  const topicWeight = sameTopic ? 1.95 : 0.55 + topicPreference;
  const difficultyWeight = 1.25 - Math.min(difficultyGap, 3) * 0.23 + difficultyPreference * 0.6;
  const sourceWeight = 0.45 + sourcePreference;
  const qualityWeight = 0.8 + starQuality * 1.2 + contestQuality * 1.1;
  const noveltyWeight = playedGameIds.has(toGame.id) ? 0.04 : 1.1 + explore * 0.55;
  const freshnessWeight = 0.4 + freshness;

  return Math.max(
    0.001,
    topicWeight +
      difficultyWeight +
      sourceWeight +
      qualityWeight +
      noveltyWeight +
      freshnessWeight +
      popularity,
  );
}

function topicBackoffWeight(
  fromGame: gameRoom,
  toGame: gameRoom,
  topicAffinity: Map<string, number>,
  preferredDifficulty: number,
): number {
  if (fromGame.id === toGame.id) return 0;

  const fromTopic = normalizeTopic(fromGame.topic);
  const toTopic = normalizeTopic(toGame.topic);
  const sameTopic = fromTopic === toTopic;
  const topicPreference = topicAffinity.get(toTopic) || 0;
  const diffFit = difficultyFitScore(toGame, preferredDifficulty);
  const quality = qualityScore(toGame);

  return Math.max(0.001, (sameTopic ? 1.5 : 0.5) + topicPreference * 1.4 + diffFit * 0.8 + quality * 0.9);
}

function buildTransitionMatrix(
  games: gameRoom[],
  playedGameIds: Set<string>,
  topicAffinity: Map<string, number>,
  preferredDifficulty: number,
  officialAffinity: number,
  explore: number,
  maxNeighbors: number,
): { local: number[][]; backoff: number[][] } {
  const matrix: number[][] = [];
  const backoffMatrix: number[][] = [];

  for (let i = 0; i < games.length; i += 1) {
    const fromGame = games[i];

    const scored = games
      .map((toGame, index) => ({
        index,
        weight: transitionWeight(
          fromGame,
          toGame,
          playedGameIds,
          topicAffinity,
          preferredDifficulty,
          officialAffinity,
          explore,
        ),
      }))
      .filter(({ index, weight }) => index !== i && weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxNeighbors);

    const backoffScored = games
      .map((toGame, index) => ({
        index,
        weight: topicBackoffWeight(fromGame, toGame, topicAffinity, preferredDifficulty),
      }))
      .filter(({ index, weight }) => index !== i && weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, Math.max(6, Math.floor(maxNeighbors * 0.7)));

    const row = new Array(games.length).fill(0);
    const backoffRow = new Array(games.length).fill(0);

    for (const item of scored) {
      row[item.index] = item.weight;
    }
    for (const item of backoffScored) {
      backoffRow[item.index] = item.weight;
    }

    matrix.push(normalizeRow(row, i));
    backoffMatrix.push(normalizeRow(backoffRow, i));
  }

  return {
    local: matrix,
    backoff: backoffMatrix,
  };
}

function adaptiveDamping(playedCount: number, totalCount: number): number {
  if (totalCount <= 0) return DEFAULT_DAMPING;
  const ratio = clamp(playedCount / totalCount, 0, 1);
  return clamp(0.78 + ratio * 0.15, 0.78, 0.93);
}

function blendRows(localWeight: number, backoffWeight: number): { local: number; backoff: number } {
  const total = localWeight + backoffWeight;
  if (total <= 0) {
    return { local: 0.5, backoff: 0.5 };
  }

  return {
    local: localWeight / total,
    backoff: backoffWeight / total,
  };
}

function runPersonalizedPageRank(
  transition: { local: number[][]; backoff: number[][] },
  teleport: number[],
  damping: number,
  iterations: number,
): number[] {
  let rank = [...teleport];
  const n = rank.length;
  const rowBlend = blendRows(0.72, 0.28);

  for (let step = 0; step < iterations; step += 1) {
    const next = new Array(n).fill(0);

    for (let i = 0; i < n; i += 1) {
      const row = transition.local[i];
      const backoffRow = transition.backoff[i];
      const rankShare = rank[i] * damping;
      let hasOutgoing = false;

      for (let j = 0; j < n; j += 1) {
        const probability = rowBlend.local * row[j] + rowBlend.backoff * backoffRow[j];
        if (probability > 0) {
          next[j] += rankShare * probability;
          hasOutgoing = true;
        }
      }

      if (!hasOutgoing) {
        const distribute = rankShare / n;
        for (let j = 0; j < n; j += 1) {
          next[j] += distribute;
        }
      }
    }

    for (let j = 0; j < n; j += 1) {
      next[j] += (1 - damping) * teleport[j];
    }

    rank = normalize(next);
  }

  return rank;
}

export function rankGamesWithPersonalizedPageRank({
  games,
  playedGameIds,
  damping,
  iterations = DEFAULT_ITERATIONS,
  maxNeighbors = DEFAULT_MAX_NEIGHBORS,
}: PageRankInput): RankedGame[] {
  if (games.length === 0) return [];

  const topicAffinity = computeTopicAffinity(games, playedGameIds);
  const preferredDifficulty = estimatePreferredDifficulty(games, playedGameIds);
  const officialAffinity = estimateOfficialAffinity(games, playedGameIds);
  const explore = explorationPressure(games, playedGameIds);
  const effectiveDamping = damping ?? adaptiveDamping(playedGameIds.size, games.length);

  const teleport = buildTeleport(
    games,
    playedGameIds,
    topicAffinity,
    preferredDifficulty,
    officialAffinity,
    explore,
  );
  const transition = buildTransitionMatrix(
    games,
    playedGameIds,
    topicAffinity,
    preferredDifficulty,
    officialAffinity,
    explore,
    maxNeighbors,
  );
  const pageRank = runPersonalizedPageRank(transition, teleport, effectiveDamping, iterations);

  return games
    .map((game, index) => {
      const pageRankScore = pageRank[index] || 0;
      const playedPenalty = playedGameIds.has(game.id) ? 1000 : 0;
      const starComponent = starRatingScore(game) * 0.25;
      const contestComponent = contestRatingScore(game) * 0.25;
      const difficultyComponent = difficultyFitScore(game, preferredDifficulty) * 0.15;
      const qualityPrior = starComponent + contestComponent + difficultyComponent;
      const noveltyBonus = playedGameIds.has(game.id) ? 0 : 0.12 + 0.08 * explore;
      const finalScore = pageRankScore + qualityPrior + noveltyBonus - playedPenalty;

      return {
        game,
        pageRankScore,
        finalScore,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
