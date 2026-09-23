import {
  DEFAULT_PACING,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  LiveAnswer,
  LivePlayer,
  MIN_SECONDS_PER_QUESTION,
  answerProgress,
  formatLiveTime,
  generateJoinCode,
  ghostOrder,
  hasSelection,
  isAnswerCorrect,
  maxSecondsPerQuestion,
  nextPhase,
  normalizeJoinCode,
  normalizePacing,
  phaseDurationSeconds,
  rankStandings,
  scoredQuestionCount,
  summarizePlayer,
  toUserAnswers,
  toggleChoice,
  validatePacing,
} from "@/lib/liveGame";

function player(overrides: Partial<LivePlayer>): LivePlayer {
  return {
    uid: "u1",
    username: "Ada",
    handle: "ada",
    photoURL: "",
    bElo: 500,
    answers: {},
    correctCount: 0,
    totalMs: 0,
    ghost: false,
    ...overrides,
  };
}

function answer(overrides: Partial<LiveAnswer>): LiveAnswer {
  return { choice: "a", elapsedMs: 1000, locked: false, ...overrides };
}

describe("nextPhase", () => {
  it("walks one question through read, answer, reveal, standings", () => {
    expect(nextPhase("lobby", 0, 3)).toEqual({ phase: "reading", questionIndex: 0 });
    expect(nextPhase("reading", 0, 3)).toEqual({ phase: "answering", questionIndex: 0 });
    expect(nextPhase("answering", 0, 3)).toEqual({ phase: "reveal", questionIndex: 0 });
    expect(nextPhase("reveal", 0, 3)).toEqual({ phase: "leaderboard", questionIndex: 0 });
  });

  it("moves to the next question after the standings", () => {
    expect(nextPhase("leaderboard", 0, 3)).toEqual({
      phase: "reading",
      questionIndex: 1,
    });
  });

  it("ends the game after the last question's standings", () => {
    expect(nextPhase("leaderboard", 2, 3)).toEqual({
      phase: "final",
      questionIndex: 2,
    });
    expect(nextPhase("final", 2, 3)).toBeNull();
  });

  it("refuses to start a set with no questions", () => {
    expect(nextPhase("lobby", 0, 0)).toBeNull();
  });
});

describe("phaseDurationSeconds", () => {
  it("clocks the timed phases and leaves lobby and podium open-ended", () => {
    const pacing = { ...DEFAULT_PACING, secondsPerQuestion: 25, readSeconds: 3 };
    expect(phaseDurationSeconds("reading", pacing)).toBe(3);
    expect(phaseDurationSeconds("answering", pacing)).toBe(25);
    expect(phaseDurationSeconds("reveal", pacing)).toBe(pacing.revealSeconds);
    expect(phaseDurationSeconds("leaderboard", pacing)).toBe(
      pacing.leaderboardSeconds,
    );
    expect(phaseDurationSeconds("lobby", pacing)).toBeNull();
    expect(phaseDurationSeconds("final", pacing)).toBeNull();
  });
});

describe("validatePacing", () => {
  const pacing = (secondsPerQuestion: number) => ({
    ...DEFAULT_PACING,
    secondsPerQuestion,
  });

  it("accepts a pace that fits inside the set's time limit", () => {
    expect(validatePacing(pacing(20), 10, 600)).toEqual([]);
    // Exactly the limit is still inside it.
    expect(validatePacing(pacing(60), 10, 600)).toEqual([]);
  });

  it("rejects a pace whose total exceeds the set's time limit", () => {
    const errors = validatePacing(pacing(61), 10, 600);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("over this blitz's 600s limit");
  });

  it("rejects a pace below the per-question floor", () => {
    expect(validatePacing(pacing(1), 10, 600)[0]).toContain(
      `${MIN_SECONDS_PER_QUESTION} seconds`,
    );
  });

  it("rejects a set with no questions", () => {
    expect(validatePacing(pacing(20), 0, 600)).toEqual([
      "This blitz has no questions to host.",
    ]);
  });
});

describe("maxSecondsPerQuestion", () => {
  it("divides the set's limit across its questions, rounding down", () => {
    expect(maxSecondsPerQuestion(10, 600)).toBe(60);
    expect(maxSecondsPerQuestion(7, 100)).toBe(14);
  });
});

describe("normalizePacing", () => {
  it("clamps untrusted input into the allowed range", () => {
    const pacing = normalizePacing({
      secondsPerQuestion: 9999,
      readSeconds: -5,
      revealSeconds: 0,
      leaderboardSeconds: 7,
    });
    expect(pacing.secondsPerQuestion).toBe(120);
    expect(pacing.readSeconds).toBe(0);
    expect(pacing.revealSeconds).toBe(1);
    expect(pacing.leaderboardSeconds).toBe(7);
  });

  it("falls back to the defaults for junk", () => {
    expect(normalizePacing({ secondsPerQuestion: NaN } as any).secondsPerQuestion).toBe(
      DEFAULT_PACING.secondsPerQuestion,
    );
    expect(normalizePacing(undefined)).toEqual(DEFAULT_PACING);
  });
});

describe("isAnswerCorrect", () => {
  it("matches single-answer questions", () => {
    expect(isAnswerCorrect("b", "b")).toBe(true);
    expect(isAnswerCorrect("a", "b")).toBe(false);
    expect(isAnswerCorrect("", "b")).toBe(false);
    expect(isAnswerCorrect(undefined, "b")).toBe(false);
  });

  it("matches select-all questions regardless of pick order", () => {
    expect(isAnswerCorrect(["c", "a"], ["a", "c"])).toBe(true);
    expect(isAnswerCorrect(["a"], ["a", "c"])).toBe(false);
    expect(isAnswerCorrect(["a", "b", "c"], ["a", "c"])).toBe(false);
    expect(isAnswerCorrect([], ["a"])).toBe(false);
  });

  it("treats a one-item array as that single answer", () => {
    expect(isAnswerCorrect(["b"], "b")).toBe(true);
    expect(isAnswerCorrect(["a", "b"], "b")).toBe(false);
  });
});

describe("toggleChoice", () => {
  it("replaces the pick on a single-answer question", () => {
    expect(toggleChoice("a", "b", false)).toBe("b");
  });

  it("clears the pick when the same choice is tapped again", () => {
    expect(toggleChoice("a", "a", false)).toBe("");
  });

  it("adds and removes on a select-all question", () => {
    expect(toggleChoice(undefined, "a", true)).toEqual(["a"]);
    expect(toggleChoice(["a"], "c", true)).toEqual(["a", "c"]);
    expect(toggleChoice(["a", "c"], "a", true)).toEqual(["c"]);
  });
});

describe("rankStandings", () => {
  it("puts correct answers first and breaks ties on cumulative time", () => {
    const ranked = rankStandings([
      player({ uid: "slow", username: "Slow", correctCount: 3, totalMs: 41_000 }),
      player({ uid: "fast", username: "Fast", correctCount: 3, totalMs: 40_999 }),
      player({ uid: "best", username: "Best", correctCount: 4, totalMs: 90_000 }),
    ]);
    expect(ranked.map((r) => r.uid)).toEqual(["best", "fast", "slow"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("separates players who tie to the second but not the millisecond", () => {
    const ranked = rankStandings([
      player({ uid: "b", username: "B", correctCount: 1, totalMs: 4_820 }),
      player({ uid: "a", username: "A", correctCount: 1, totalMs: 4_210 }),
    ]);
    expect(ranked.map((r) => r.uid)).toEqual(["a", "b"]);
  });

  it("leaves ghosts out of the standings entirely", () => {
    const ranked = rankStandings([
      player({ uid: "ghost", username: "Ghost", correctCount: 5, totalMs: 1_000, ghost: true }),
      player({ uid: "real", username: "Real", correctCount: 1, totalMs: 80_000 }),
    ]);
    expect(ranked.map((r) => r.uid)).toEqual(["real"]);
    // A ghost who beat everyone still must not take the top rank away.
    expect(ranked[0].rank).toBe(1);
  });

  it("returns nothing when only ghosts are in the room", () => {
    expect(rankStandings([player({ uid: "g", ghost: true })])).toEqual([]);
  });

  it("does not mutate the array it was given", () => {
    const input = [
      player({ uid: "a", correctCount: 1 }),
      player({ uid: "b", correctCount: 2 }),
    ];
    rankStandings(input);
    expect(input.map((p) => p.uid)).toEqual(["a", "b"]);
  });
});

describe("ghostOrder", () => {
  it("returns only ghosts, ordered the same way the standings are", () => {
    const ghosts = ghostOrder([
      player({ uid: "slow", username: "Slow", correctCount: 2, totalMs: 9_000, ghost: true }),
      player({ uid: "real", username: "Real", correctCount: 3, totalMs: 1_000 }),
      player({ uid: "fast", username: "Fast", correctCount: 2, totalMs: 8_999, ghost: true }),
    ]);
    expect(ghosts.map((g) => g.uid)).toEqual(["fast", "slow"]);
  });

  it("never hands back a rank", () => {
    const [ghost] = ghostOrder([player({ uid: "g", ghost: true })]);
    expect(ghost).not.toHaveProperty("rank");
  });
});

describe("formatLiveTime", () => {
  it("shows minutes, seconds and milliseconds", () => {
    expect(formatLiveTime(0)).toBe("0:00.000");
    expect(formatLiveTime(1_234)).toBe("0:01.234");
    expect(formatLiveTime(61_007)).toBe("1:01.007");
    expect(formatLiveTime(600_000)).toBe("10:00.000");
  });

  it("treats junk as zero", () => {
    expect(formatLiveTime(NaN)).toBe("0:00.000");
    expect(formatLiveTime(-5)).toBe("0:00.000");
  });
});

describe("summarizePlayer", () => {
  it("counts correct answers and totals the time taken", () => {
    const summary = summarizePlayer(
      {
        "0": answer({ elapsedMs: 1_500, correct: true }),
        "1": answer({ elapsedMs: 9_000, correct: false }),
      },
      2,
      20,
    );
    expect(summary.correctCount).toBe(1);
    expect(summary.totalMs).toBe(10_500);
    expect(summary.questionTimings).toEqual([1_500, 9_000]);
  });

  it("charges an unanswered question the full question time", () => {
    const summary = summarizePlayer(
      { "0": answer({ elapsedMs: 1_000, correct: true }) },
      3,
      20,
    );
    expect(summary.correctCount).toBe(1);
    expect(summary.totalMs).toBe(1_000 + 20_000 + 20_000);
    expect(summary.questionTimings).toEqual([1_000, 20_000, 20_000]);
  });

  it("charges a recorded but empty answer the full question time", () => {
    const summary = summarizePlayer(
      { "0": answer({ choice: "", elapsedMs: 0, correct: false }) },
      1,
      15,
    );
    expect(summary.totalMs).toBe(15_000);
  });
});

describe("toUserAnswers", () => {
  it("builds the index-keyed map the grader reads, skipping blanks", () => {
    expect(
      toUserAnswers(
        {
          "0": answer({ choice: "b" }),
          "1": answer({ choice: "" }),
          "2": answer({ choice: ["a", "c"] }),
        },
        3,
      ),
    ).toEqual({ 0: "b", 2: ["a", "c"] });
  });

  it("is empty for a player who never answered", () => {
    expect(toUserAnswers({}, 5)).toEqual({});
  });
});

describe("scoredQuestionCount", () => {
  it("counts the current question only once its answer is up", () => {
    expect(scoredQuestionCount("reading", 2, 10)).toBe(2);
    expect(scoredQuestionCount("answering", 2, 10)).toBe(2);
    expect(scoredQuestionCount("reveal", 2, 10)).toBe(3);
    expect(scoredQuestionCount("leaderboard", 2, 10)).toBe(3);
    expect(scoredQuestionCount("final", 2, 10)).toBe(10);
  });
});

describe("answerProgress", () => {
  it("separates players who have picked from players who have locked in", () => {
    const progress = answerProgress(
      [
        player({ uid: "a", answers: { "0": answer({ locked: true }) } }),
        player({ uid: "b", answers: { "0": answer({ locked: false }) } }),
        player({ uid: "c", answers: { "0": answer({ choice: "" }) } }),
        player({ uid: "d" }),
      ],
      0,
    );
    expect(progress).toEqual({ answered: 2, locked: 1, total: 4 });
  });
});

describe("hasSelection", () => {
  it("is false for blanks and empty arrays", () => {
    expect(hasSelection("a")).toBe(true);
    expect(hasSelection(["a"])).toBe(true);
    expect(hasSelection("")).toBe(false);
    expect(hasSelection([])).toBe(false);
    expect(hasSelection(undefined)).toBe(false);
  });
});

describe("join codes", () => {
  it("generates codes of the right length from the safe alphabet", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      expect(code.split("").every((c) => JOIN_CODE_ALPHABET.includes(c))).toBe(true);
    }
  });

  it("leaves out glyphs that are easy to misread aloud", () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[IO01]/);
  });

  it("normalizes what a player types", () => {
    expect(normalizeJoinCode("abc-234")).toBe("ABC234");
    expect(normalizeJoinCode(" a b c 2 3 4 ")).toBe("ABC234");
    expect(normalizeJoinCode("ABC2345678")).toBe("ABC234");
    expect(normalizeJoinCode("")).toBe("");
  });

  it("drops characters that are not in the alphabet", () => {
    expect(normalizeJoinCode("AI0O1B")).toBe("AB");
  });
});
