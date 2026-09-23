/**
 * Shared, dependency-free logic for live ("hosted") blitzes.
 *
 * A live blitz is a host-driven run of an existing set: the host picks a set,
 * a join code is generated, players who have never played that set join the
 * lobby, and the host walks everyone through the same question at the same
 * time. Every phase transition is driven by the host, timed by the server, and
 * at the end each player's run is written to `gameSubmissions` exactly like a
 * normal ranked attempt so Elo and stats pick it up unchanged.
 *
 * This module holds only the parts both the client and the server need, kept
 * free of Firebase so it can be unit tested directly.
 */

export const LIVE_GAMES_COLLECTION = "liveGames";
export const LIVE_JOIN_CODES_COLLECTION = "liveJoinCodes";

/** Ambiguous glyphs (I/O/0/1) are left out so codes survive being read aloud. */
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 6;

export const MAX_LIVE_PLAYERS = 100;
export const MAX_LIVE_QUESTIONS = 60;

export const MIN_SECONDS_PER_QUESTION = 5;
export const MIN_PHASE_SECONDS = 1;
export const MAX_PHASE_SECONDS = 120;

export const DEFAULT_READ_SECONDS = 3;
export const DEFAULT_REVEAL_SECONDS = 10;
export const DEFAULT_LEADERBOARD_SECONDS = 5;

/**
 * `reading` shows the question stem with the choices still hidden, `answering`
 * reveals the choices and runs the per-question clock, `reveal` paints every
 * answer green or red, `leaderboard` shows the running standings.
 */
export type LivePhase =
  | "lobby"
  | "reading"
  | "answering"
  | "reveal"
  | "leaderboard"
  | "final";

export type LiveStatus = "lobby" | "running" | "ended" | "cancelled";

export type LivePacing = {
  secondsPerQuestion: number;
  readSeconds: number;
  revealSeconds: number;
  leaderboardSeconds: number;
};

/** A single player's answer to one question, as recorded on their player doc. */
export type LiveAnswer = {
  /** Letter key, or an array of letter keys for select-all questions. */
  choice: string | string[];
  /** Milliseconds from the start of the answering phase to the last change. */
  elapsedMs: number;
  /** True once the player has submitted early and can no longer change it. */
  locked: boolean;
  /** Filled in by the server when the host advances to the reveal. */
  correct?: boolean;
};

export type LivePlayer = {
  uid: string;
  username: string;
  handle: string;
  photoURL: string;
  bElo: number;
  answers: Record<string, LiveAnswer>;
  correctCount: number;
  totalMs: number;
  /**
   * A player who has already played this set. Ghosts answer along with the
   * room and see their own score, but they are kept out of every ranking and
   * no submission is filed for them — their rated attempt already happened.
   */
  ghost: boolean;
};

export type LiveStanding = LivePlayer & { rank: number };

export const DEFAULT_PACING: LivePacing = {
  secondsPerQuestion: 20,
  readSeconds: DEFAULT_READ_SECONDS,
  revealSeconds: DEFAULT_REVEAL_SECONDS,
  leaderboardSeconds: DEFAULT_LEADERBOARD_SECONDS,
};

/**
 * How long a phase runs before the host screen auto-advances. `lobby` and
 * `final` have no clock — they wait on the host.
 */
export function phaseDurationSeconds(
  phase: LivePhase,
  pacing: LivePacing,
): number | null {
  switch (phase) {
    case "reading":
      return pacing.readSeconds;
    case "answering":
      return pacing.secondsPerQuestion;
    case "reveal":
      return pacing.revealSeconds;
    case "leaderboard":
      return pacing.leaderboardSeconds;
    default:
      return null;
  }
}

/**
 * The phase machine. Returns the state the game moves to, or null when there
 * is nowhere left to go (the game is over).
 */
export function nextPhase(
  phase: LivePhase,
  questionIndex: number,
  questionCount: number,
): { phase: LivePhase; questionIndex: number } | null {
  switch (phase) {
    case "lobby":
      return questionCount > 0 ? { phase: "reading", questionIndex: 0 } : null;
    case "reading":
      return { phase: "answering", questionIndex };
    case "answering":
      return { phase: "reveal", questionIndex };
    case "reveal":
      return { phase: "leaderboard", questionIndex };
    case "leaderboard":
      return questionIndex + 1 < questionCount
        ? { phase: "reading", questionIndex: questionIndex + 1 }
        : { phase: "final", questionIndex };
    case "final":
      return null;
  }
}

/** True while players should be able to pick or change an answer. */
export function isAnsweringPhase(phase: LivePhase): boolean {
  return phase === "answering";
}

/** True once the correct answer for the current question is public. */
export function isRevealedPhase(phase: LivePhase): boolean {
  return phase === "reveal" || phase === "leaderboard" || phase === "final";
}

/**
 * Same comparison the `gradeTest` Cloud Function uses, so a live answer is
 * scored identically to the same answer given in a solo attempt.
 */
export function isAnswerCorrect(
  userAnswer: string | string[] | undefined | null,
  correct: string | string[] | undefined | null,
): boolean {
  if (Array.isArray(correct)) {
    const userArr = (
      Array.isArray(userAnswer) ? [...userAnswer] : userAnswer ? [userAnswer] : []
    ).sort();
    const correctArr = [...correct].sort();
    return (
      userArr.length === correctArr.length &&
      userArr.every((a, i) => a === correctArr[i])
    );
  }
  if (Array.isArray(userAnswer)) {
    return userAnswer.length === 1 && !!correct && userAnswer[0] === correct;
  }
  return !!(userAnswer && userAnswer === correct);
}

/** True when the player actually picked something (vs. an empty selection). */
export function hasSelection(choice: string | string[] | undefined | null): boolean {
  return Array.isArray(choice) ? choice.length > 0 : !!choice;
}

/** Applies a tap on `key` to a single- or multi-select question. */
export function toggleChoice(
  current: string | string[] | undefined,
  key: string,
  multiSelect: boolean,
): string | string[] {
  if (!multiSelect) return current === key ? "" : key;
  const arr = Array.isArray(current) ? [...current] : current ? [current] : [];
  const at = arr.indexOf(key);
  if (at === -1) arr.push(key);
  else arr.splice(at, 1);
  return arr;
}

/**
 * Bioblitz's standard ordering: correct answers first, cumulative answer time
 * as the tie-breaker. Time is compared in milliseconds because players click
 * fast enough that whole seconds routinely tie.
 */
function comparePlayers(a: LivePlayer, b: LivePlayer): number {
  return (
    b.correctCount - a.correctCount ||
    a.totalMs - b.totalMs ||
    a.username.localeCompare(b.username)
  );
}

/**
 * The competitive standings. Ghosts are dropped here rather than at each call
 * site, so there is exactly one place a replayer could leak into a ranking.
 */
export function rankStandings(players: LivePlayer[]): LiveStanding[] {
  return players
    .filter((player) => !player.ghost)
    .sort(comparePlayers)
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

/**
 * Ghosts in the same order, for the "playing along" list. Deliberately returns
 * `LivePlayer`, not `LiveStanding` — a ghost never has a rank to show.
 */
export function ghostOrder(players: LivePlayer[]): LivePlayer[] {
  return players.filter((player) => player.ghost).sort(comparePlayers);
}

/** `m:ss.mmm` — milliseconds are shown because they decide ties. */
export function formatLiveTime(totalMs: number): string {
  const safe = Number.isFinite(totalMs) && totalMs > 0 ? Math.round(totalMs) : 0;
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const millis = safe % 1000;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${millis
    .toString()
    .padStart(3, "0")}`;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const num = Math.floor(Number(value));
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

/** Coerces untrusted pacing input into the allowed range. */
export function normalizePacing(raw: Partial<LivePacing> | undefined): LivePacing {
  return {
    secondsPerQuestion: clampInt(
      raw?.secondsPerQuestion,
      MIN_SECONDS_PER_QUESTION,
      MAX_PHASE_SECONDS,
      DEFAULT_PACING.secondsPerQuestion,
    ),
    readSeconds: clampInt(
      raw?.readSeconds,
      0,
      MAX_PHASE_SECONDS,
      DEFAULT_READ_SECONDS,
    ),
    revealSeconds: clampInt(
      raw?.revealSeconds,
      MIN_PHASE_SECONDS,
      MAX_PHASE_SECONDS,
      DEFAULT_REVEAL_SECONDS,
    ),
    leaderboardSeconds: clampInt(
      raw?.leaderboardSeconds,
      MIN_PHASE_SECONDS,
      MAX_PHASE_SECONDS,
      DEFAULT_LEADERBOARD_SECONDS,
    ),
  };
}

/**
 * The one hard rule on pacing: the answering time the host hands out across
 * the whole game may not exceed the set's own time limit.
 */
export function validatePacing(
  pacing: LivePacing,
  questionCount: number,
  timeLimitSeconds: number,
): string[] {
  const errors: string[] = [];

  if (questionCount <= 0) {
    errors.push("This blitz has no questions to host.");
    return errors;
  }
  if (questionCount > MAX_LIVE_QUESTIONS) {
    errors.push(
      `Live blitzes are capped at ${MAX_LIVE_QUESTIONS} questions — this set has ${questionCount}.`,
    );
  }
  if (pacing.secondsPerQuestion < MIN_SECONDS_PER_QUESTION) {
    errors.push(
      `Give players at least ${MIN_SECONDS_PER_QUESTION} seconds per question.`,
    );
  }
  if (timeLimitSeconds > 0 && pacing.secondsPerQuestion * questionCount > timeLimitSeconds) {
    errors.push(
      `${pacing.secondsPerQuestion}s x ${questionCount} questions is ${
        pacing.secondsPerQuestion * questionCount
      }s, over this blitz's ${timeLimitSeconds}s limit. Max is ${maxSecondsPerQuestion(
        questionCount,
        timeLimitSeconds,
      )}s per question.`,
    );
  }
  return errors;
}

/** The largest per-question time the set's own limit leaves room for. */
export function maxSecondsPerQuestion(
  questionCount: number,
  timeLimitSeconds: number,
): number {
  if (questionCount <= 0 || timeLimitSeconds <= 0) return MAX_PHASE_SECONDS;
  return Math.min(MAX_PHASE_SECONDS, Math.floor(timeLimitSeconds / questionCount));
}

/** True when the set can be hosted live at all (enough time for a real round). */
export function canHostSet(
  questionCount: number,
  timeLimitSeconds: number,
): boolean {
  return (
    questionCount > 0 &&
    questionCount <= MAX_LIVE_QUESTIONS &&
    maxSecondsPerQuestion(questionCount, timeLimitSeconds) >= MIN_SECONDS_PER_QUESTION
  );
}

export function generateJoinCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i += 1) {
    code += JOIN_CODE_ALPHABET[Math.floor(random() * JOIN_CODE_ALPHABET.length)];
  }
  return code;
}

/** Forgiving parse of what a player typed: case, spaces and dashes all work. */
export function normalizeJoinCode(raw: string): string {
  return (raw || "")
    .toUpperCase()
    .split("")
    .filter((char) => JOIN_CODE_ALPHABET.includes(char))
    .join("")
    .slice(0, JOIN_CODE_LENGTH);
}

/**
 * Totals a player's run. Unanswered questions score nothing and are charged
 * the full question time, so sitting one out is never faster than guessing.
 */
export function summarizePlayer(
  answers: Record<string, LiveAnswer>,
  questionCount: number,
  secondsPerQuestion: number,
): { correctCount: number; totalMs: number; questionTimings: number[] } {
  const missMs = secondsPerQuestion * 1000;
  let correctCount = 0;
  let totalMs = 0;
  const questionTimings: number[] = [];

  for (let i = 0; i < questionCount; i += 1) {
    const answer = answers[String(i)];
    if (answer?.correct) correctCount += 1;
    const ms = answer && hasSelection(answer.choice) ? answer.elapsedMs : missMs;
    questionTimings.push(ms);
    totalMs += ms;
  }
  return { correctCount, totalMs, questionTimings };
}

/** Flattens recorded answers into the `{ [index]: choice }` map gradeTest reads. */
export function toUserAnswers(
  answers: Record<string, LiveAnswer>,
  questionCount: number,
): Record<number, string | string[]> {
  const out: Record<number, string | string[]> = {};
  for (let i = 0; i < questionCount; i += 1) {
    const answer = answers[String(i)];
    if (answer && hasSelection(answer.choice)) out[i] = answer.choice;
  }
  return out;
}

/**
 * How many questions have been graded so far — the denominator the running
 * standings are shown out of.
 */
export function scoredQuestionCount(
  phase: LivePhase,
  currentQuestion: number,
  questionCount: number,
): number {
  switch (phase) {
    case "reveal":
    case "leaderboard":
      return Math.min(questionCount, currentQuestion + 1);
    case "final":
      return questionCount;
    default:
      return Math.min(questionCount, currentQuestion);
  }
}

/** Human label for the phase, used on the host's control bar. */
export function phaseLabel(phase: LivePhase): string {
  switch (phase) {
    case "lobby":
      return "Lobby";
    case "reading":
      return "Reading";
    case "answering":
      return "Answering";
    case "reveal":
      return "Answer";
    case "leaderboard":
      return "Standings";
    case "final":
      return "Results";
  }
}

/** Tally of who is done with the question currently on screen. */
export function answerProgress(
  players: LivePlayer[],
  questionIndex: number,
): { answered: number; locked: number; total: number } {
  let answered = 0;
  let locked = 0;
  players.forEach((player) => {
    const answer = player.answers[String(questionIndex)];
    if (answer && hasSelection(answer.choice)) answered += 1;
    if (answer?.locked) locked += 1;
  });
  return { answered, locked, total: players.length };
}
