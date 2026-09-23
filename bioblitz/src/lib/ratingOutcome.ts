/**
 * What the "Rating" tile should show once a blitz is over.
 *
 * `gradeTest` writes `ratingDelta` onto a submission only when all of these
 * hold: the attempt was a first attempt, the player is not the set's creator,
 * and the set had already reached the 25 first attempts that activate its
 * rating. Every other outcome — a replay, a practice run, your own blitz, a
 * set still short of activation, a player who never answered a question and so
 * never had a submission filed at all — leaves `ratingDelta` unset *forever*.
 *
 * A UI that simply waits for the field therefore spins for eternity in all of
 * those cases. Each of them is a real, final answer, so this maps them to one.
 */

export type SubmissionLike = {
  status?: string;
  ranked?: boolean;
  earlyEntry?: boolean;
  ratingDelta?: number | null;
} | null;

export type RatingOutcome =
  /** Rated: show the signed delta. */
  | { kind: "delta"; delta: number }
  /** Grading is genuinely still in flight — keep the spinner. */
  | { kind: "pending" }
  /** Settled, but with no rating change. `hint` explains why. */
  | { kind: "label"; label: string; hint?: string };

/**
 * `exists` is the submission doc's existence, kept separate from its data so a
 * missing doc (nothing was ever filed) reads differently from one that is
 * present but ungraded.
 *
 * `settled` is the caller's "we have waited long enough" flag. It gates only
 * the outcomes that a late write could still overtake: a set that activates on
 * this very submission gets its delta moments after `earlyEntry` is written,
 * and showing "pending activation" in that gap would be wrong.
 */
export function ratingOutcome({
  submission,
  exists,
  settled,
  ownBlitz = false,
}: {
  submission: SubmissionLike;
  exists: boolean;
  settled: boolean;
  ownBlitz?: boolean;
}): RatingOutcome {
  if (typeof submission?.ratingDelta === "number") {
    return { kind: "delta", delta: submission.ratingDelta };
  }

  if (!exists) {
    return settled
      ? {
          kind: "label",
          label: "Not rated",
          hint: "No rated attempt was filed for this run.",
        }
      : { kind: "pending" };
  }

  const status = submission?.status;

  if (status === "graded_replay") {
    return {
      kind: "label",
      label: "Replay",
      hint: "You had already played this blitz.",
    };
  }

  if (typeof status === "string" && status.startsWith("error")) {
    return {
      kind: "label",
      label: "Not rated",
      hint: "This run could not be graded.",
    };
  }

  if (submission?.ranked === false) {
    return ownBlitz
      ? { kind: "label", label: "Your blitz", hint: "Creators are not rated on their own blitz." }
      : { kind: "label", label: "Practice", hint: "Practice runs do not change your rating." };
  }

  if (!settled) return { kind: "pending" };

  if (submission?.earlyEntry === true) {
    return {
      kind: "label",
      label: "Pending activation",
      hint: "This blitz rates everyone once it reaches 25 first attempts.",
    };
  }

  return {
    kind: "label",
    label: "Not rated",
    hint: "No rating change was recorded for this run.",
  };
}

/** How long to keep spinning before a missing `ratingDelta` is called final. */
export const RATING_SETTLE_MS = 12000;
