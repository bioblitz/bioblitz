"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DM_Sans } from "next/font/google";
import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Check, Ghost, Loader2, Lock, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLiveGame, usePhaseCountdown } from "@/hooks/useLiveGame";
import { liveFetch } from "@/lib/liveClient";
import {
  formatLiveTime,
  hasSelection,
  isAnswerCorrect,
  phaseDurationSeconds,
  scoredQuestionCount,
  toggleChoice,
} from "@/lib/liveGame";
import LiveAvatar from "@/components/features/live/LiveAvatar";
import LiveGhostList from "@/components/features/live/LiveGhostList";
import LivePodium from "@/components/features/live/LivePodium";
import LiveQuestionPanel from "@/components/features/live/LiveQuestionPanel";
import LiveStandings from "@/components/features/live/LiveStandings";
import PhaseClock from "@/components/features/live/PhaseClock";
import {
  RATING_SETTLE_MS,
  ratingOutcome,
  SubmissionLike,
} from "@/lib/ratingOutcome";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export default function LivePlayPage() {
  const { liveGameId } = useParams<{ liveGameId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const {
    game,
    players,
    standings,
    ghosts,
    questions,
    loading,
    playersLoaded,
    missing,
    skewMs,
  } = useLiveGame(liveGameId);

  // While the clock is running the local pick leads and the server confirms;
  // otherwise a slow round-trip would make taps feel like they bounced.
  const [selection, setSelection] = useState<string | string[]>("");
  const [saving, setSaving] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{
    exists: boolean;
    data: SubmissionLike;
  } | null>(null);
  const [ratingSettled, setRatingSettled] = useState(false);
  const lastQuestion = useRef<number | null>(null);

  const me = useMemo(
    () => players.find((player) => player.uid === user?.uid) || null,
    [players, user?.uid],
  );
  const myStanding = useMemo(
    () => standings.find((row) => row.uid === user?.uid) || null,
    [standings, user?.uid],
  );
  // Ghosts are kept out of `standings` on purpose, so their own running score
  // is read straight off their player doc instead.
  const isGhost = me?.ghost === true;
  const myCorrect = me?.correctCount ?? 0;
  const myTotalMs = me?.totalMs ?? 0;

  const rating = ratingOutcome({
    submission: submission?.data ?? null,
    exists: submission?.exists === true,
    settled: ratingSettled,
  });

  const question = game ? questions[game.currentQuestion] : undefined;
  const questionKey = String(game?.currentQuestion ?? 0);
  const myAnswer = me?.answers?.[questionKey];
  const locked = myAnswer?.locked === true;
  const revealedAnswer = game?.revealed?.[questionKey];
  const revealedSolution = game?.revealedSolutions?.[questionKey];
  const phaseSeconds = game ? phaseDurationSeconds(game.phase, game.pacing) : null;
  const remaining = usePhaseCountdown(game?.phaseEndsAtMs ?? null, skewMs);
  const scored = game
    ? scoredQuestionCount(game.phase, game.currentQuestion, game.questionCount)
    : 0;

  // New question: start from whatever the server already has for this player
  // (normally nothing, but a mid-question refresh should not lose their pick).
  useEffect(() => {
    if (!game || !me) return;
    if (lastQuestion.current === game.currentQuestion) return;
    lastQuestion.current = game.currentQuestion;
    const stored = me.answers?.[String(game.currentQuestion)];
    setSelection(stored ? stored.choice : "");
    setAnswerError(null);
  }, [game?.currentQuestion, game, me]);

  // A rejected answer only matters while answers are still open.
  useEffect(() => {
    if (game?.phase !== "answering") setAnswerError(null);
  }, [game?.phase]);

  // The rating change lands on the submission a moment after the podium does.
  // Not every run gets one, though: an unrated replay, a set still short of
  // activation, or a player who never answered (and so had no submission
  // filed) will never see `ratingDelta` appear. The whole doc is tracked, not
  // just the delta, so `ratingOutcome` can tell those apart from grading that
  // is genuinely still running.
  useEffect(() => {
    if (!game || game.phase !== "final" || !user) return;
    // A ghost's submission for this set is their earlier, unrelated attempt —
    // surfacing its delta here would read as a rating change from this round.
    if (me?.ghost === true) return;
    const ref = doc(firestore, "gameSubmissions", `${user.uid}_${game.gameId}`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setSubmission({
          exists: snap.exists(),
          data: (snap.data() as SubmissionLike) ?? null,
        });
      },
      // A permission or network failure is still an answer: stop waiting.
      () => setRatingSettled(true),
    );
    return () => unsub();
  }, [game?.phase, game?.gameId, user?.uid, game, user, me?.ghost]);

  // Nothing downstream of the podium is guaranteed to write anything, so the
  // spinner gets a deadline rather than waiting on a write that may never come.
  useEffect(() => {
    if (!game || game.phase !== "final") return;
    const timer = setTimeout(() => setRatingSettled(true), RATING_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [game?.phase]);

  const sendAnswer = async (choice: string | string[], lock: boolean) => {
    if (!game) return;
    setSaving(true);
    try {
      await liveFetch(`/api/live/${liveGameId}/answer`, {
        body: { questionIndex: game.currentQuestion, choice, lock },
      });
      setAnswerError(null);
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const pick = (key: string) => {
    if (!question || locked) return;
    const next = toggleChoice(selection, key, question.multipleCorrect === true);
    setSelection(next);
    void sendAnswer(next, false);
  };

  const lockIn = () => {
    if (!hasSelection(selection) || locked) return;
    void sendAnswer(selection, true);
  };

  const leave = async () => {
    try {
      await liveFetch(`/api/live/${liveGameId}/leave`, { body: {} });
      router.push("/live");
    } catch {
      router.push("/live");
    }
  };

  if (loading || authLoading) {
    return (
      <div className={`${dmSans.className} min-h-screen bg-neutral-900 flex items-center justify-center`}>
        <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (missing || !game) {
    return (
      <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center gap-4`}>
        <p className="text-[18px] font-bold">That live blitz no longer exists.</p>
        <Link href="/live" className="text-neutral-400 hover:text-white underline">
          Back to Live
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center gap-4 px-4 text-center`}>
        <p className="text-[18px] font-bold">Sign in to join this live blitz.</p>
        <Link href="/auth" className="text-neutral-400 hover:text-white underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!playersLoaded) {
    return (
      <div className={`${dmSans.className} min-h-screen bg-neutral-900 flex items-center justify-center`}>
        <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!me) {
    return (
      <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center gap-4 px-4 text-center`}>
        <p className="text-[18px] font-bold">You&apos;re not in this live blitz.</p>
        <p className="text-neutral-500 text-[14px] max-w-sm">
          Rooms are joined with a code before the host starts.
        </p>
        <Link href="/live" className="text-neutral-400 hover:text-white underline">
          Back to Live
        </Link>
      </div>
    );
  }

  const cancelled = game.status === "cancelled";
  // The host drives every transition, so a phase can outlive its own clock if
  // their screen is closed or offline.
  const phaseExpired = remaining !== null && remaining <= 0;
  // Decided from the answer the host just published, so the verdict lands with
  // the reveal instead of trailing the grading pass by a beat.
  const gotItRight = isAnswerCorrect(myAnswer?.choice, revealedAnswer);

  return (
    <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white pt-24 pb-16`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-[11px] font-bold text-neutral-600 mb-1" style={{ letterSpacing: "0.1em" }}>
            Live · hosted by {game.hostUsername || "a host"}
          </p>
          <h1 className="text-[28px] font-[900] text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>
            {game.gameTitle}
          </h1>
          <div className="h-[3px] w-20 bg-neutral-600 rounded-full mt-2" />
        </div>

        {cancelled && (
          <div className="mb-6 rounded-xl border border-neutral-800 bg-[rgba(9,9,11,0.8)] px-4 py-3 text-[13px] text-neutral-400">
            The host ended this room early, so nothing was recorded. This blitz is
            still yours to play whenever you like.
          </div>
        )}

        {/* ---------------- Lobby ---------------- */}
        {game.phase === "lobby" && !cancelled && (
          <div className="space-y-6">
            <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-8 text-center">
              <Loader2 className="w-6 h-6 text-neutral-600 animate-spin mx-auto mb-4" />
              <h2 className="text-[20px] font-[900] text-white mb-2">You&apos;re in</h2>
              <p className="text-neutral-500 text-[14px] max-w-sm mx-auto leading-relaxed">
                Waiting for the host to start. {game.questionCount} questions,{" "}
                {game.pacing.secondsPerQuestion} seconds each.{" "}
                {isGhost
                  ? "You have played this blitz before, so you are playing as a ghost."
                  : "This counts as a ranked attempt."}
              </p>
              {isGhost && (
                <div className="mt-5 mx-auto max-w-sm flex items-start gap-3 rounded-xl border border-dashed border-neutral-700 bg-[rgba(24,24,27,0.4)] px-4 py-3 text-left">
                  <Ghost className="w-4 h-4 text-neutral-500 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-neutral-500 leading-relaxed">
                    You answer along with everyone and see your own score, but
                    you stay off the leaderboard and the podium, and your rating
                    and stats are untouched.
                  </p>
                </div>
              )}
              <button
                onClick={leave}
                className="mt-6 px-5 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 text-[13px] font-bold hover:bg-neutral-800 hover:text-white transition-all"
              >
                Leave room
              </button>
            </div>

            <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-neutral-500" />
                <h2 className="text-[15px] font-bold text-white">
                  In the room
                  <span className="text-neutral-600"> · {players.length}</span>
                </h2>
              </div>
              <ul className="flex flex-wrap gap-3">
                {players.map((player) => (
                  <li
                    key={player.uid}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(24,24,27,0.6)] border border-neutral-800"
                  >
                    <LiveAvatar name={player.username} photoURL={player.photoURL} size={22} />
                    <span className="text-[13px] text-neutral-300">{player.username}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ---------------- Reading / answering / reveal ---------------- */}
        {(game.phase === "reading" ||
          game.phase === "answering" ||
          game.phase === "reveal") &&
          question && (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                {remaining !== null && phaseSeconds !== null && (
                  <PhaseClock
                    remainingSeconds={remaining}
                    totalSeconds={phaseSeconds}
                    label={
                      game.phase === "reading"
                        ? "Get ready"
                        : game.phase === "reveal"
                          ? "Next"
                          : "Left"
                    }
                    size={96}
                    urgent={game.phase === "answering"}
                  />
                )}
                <div className="flex-1">
                  {game.phase === "reading" && (
                    <p className="text-[16px] font-bold text-neutral-300">
                      Read the question — choices are about to appear.
                    </p>
                  )}
                  {game.phase === "answering" && (
                    <p className="text-[16px] font-bold text-neutral-300">
                      {phaseExpired
                        ? "Time. Waiting for the host..."
                        : locked
                          ? "Locked in. Sit tight."
                          : "Pick an answer. You can change it until time runs out."}
                    </p>
                  )}
                  {game.phase === "reveal" &&
                    (gotItRight ? (
                      <p className="text-[18px] font-[900] text-emerald-400 flex items-center gap-2">
                        <Check className="w-5 h-5" /> Correct ·{""}
                        {formatLiveTime(myAnswer?.elapsedMs ?? 0)}
                      </p>
                    ) : (
                      <p className="text-[18px] font-[900] text-red-400 flex items-center gap-2">
                        <X className="w-5 h-5" />{""}
                        {hasSelection(myAnswer?.choice) ? "Not quite" : "No answer"}
                      </p>
                    ))}
                  {game.phase !== "reading" && (
                    <p className="text-[13px] text-neutral-500 mt-1 tabular-nums">
                      {myCorrect} correct · {formatLiveTime(myTotalMs)} total
                      {isGhost && (
                        <span className="ml-2 not-italic text-neutral-600">
                          · ghost
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <LiveQuestionPanel
                question={question}
                index={game.currentQuestion}
                total={game.questionCount}
                mode={
                  game.phase === "reading"
                    ? "reading"
                    : game.phase === "reveal"
                      ? "revealed"
                      : "answering"
                }
                selected={game.phase === "answering" ? selection : myAnswer?.choice}
                correct={game.phase === "reveal" ? revealedAnswer : undefined}
                solution={game.phase === "reveal" ? revealedSolution : undefined}
                locked={locked}
                interactive={game.phase === "answering" && !phaseExpired}
                onPick={pick}
              />

              {game.phase === "answering" && (
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <button
                    onClick={lockIn}
                    disabled={
                      !hasSelection(selection) || locked || saving || phaseExpired
                    }
                    className={`w-full md:w-auto px-10 py-4 rounded-xl font-bold text-[16px] transition-all flex items-center justify-center gap-2 ${
                      locked
                        ? "bg-neutral-800 text-neutral-500 cursor-default"
                        : "bg-white text-black hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    }`}
                  >
                    {locked ? (
                      <>
                        <Lock className="w-4 h-4" /> Locked in
                      </>
                    ) : saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving
                      </>
                    ) : (
                      "Lock it in"
                    )}
                  </button>
                  <p className="text-[12px] text-neutral-600 leading-snug text-center md:text-left">
                    Locking in stops the clock on this question — your time is
                    taken from your last change either way.
                  </p>
                </div>
              )}

              {answerError && (
                <p className="text-[13px] text-red-400">{answerError}</p>
              )}
            </div>
          )}

        {/* ---------------- Between-question standings ---------------- */}
        {game.phase === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[22px] font-[900] text-white" style={{ letterSpacing: "-0.02em" }}>
                  After question {game.currentQuestion + 1}
                </h2>
                {isGhost ? (
                  <p className="text-[14px] text-neutral-500 mt-1 flex items-center gap-1.5">
                    <Ghost className="w-3.5 h-3.5" />
                    Ghost run · {myCorrect} correct, {formatLiveTime(myTotalMs)}
                  </p>
                ) : myStanding ? (
                  <p className="text-[14px] text-neutral-500 mt-1">
                    You&apos;re {myStanding.rank === 1 ? "1st" : `#${myStanding.rank}`} of{" "}
                    {standings.length}
                  </p>
                ) : null}
              </div>
              {remaining !== null && phaseSeconds !== null && (
                <PhaseClock
                  remainingSeconds={remaining}
                  totalSeconds={phaseSeconds}
                  label="Next"
                  size={84}
                />
              )}
            </div>
            <LiveStandings
              standings={standings}
              questionsScored={scored}
              highlightUid={user?.uid}
              limit={10}
            />
          </div>
        )}

        {/* ---------------- Results ---------------- */}
        {game.phase === "final" && !cancelled && (
          <div className="space-y-10">
            <div
              className={`grid grid-cols-2 gap-4 ${
                isGhost ? "md:grid-cols-3" : "md:grid-cols-4"
              }`}
            >
              {!isGhost && (
                <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 p-6 rounded-2xl text-center">
                  <h2 className="text-neutral-500 font-medium text-[13px] mb-2">Place</h2>
                  <p className="text-[28px] font-[900] text-neutral-300">
                    {myStanding
                      ? myStanding.rank === 1
                        ? "🥇"
                        : myStanding.rank === 2
                          ? "🥈"
                          : myStanding.rank === 3
                            ? "🥉"
                            : `#${myStanding.rank}`
                      : "—"}
                  </p>
                </div>
              )}
              <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 p-6 rounded-2xl text-center">
                <h2 className="text-neutral-500 font-medium text-[13px] mb-2">Correct</h2>
                <p className="text-[28px] font-[900] text-white">
                  <span className="text-neutral-400">{myCorrect}</span>
                  <span className="text-neutral-600 text-[18px]"> / {game.questionCount}</span>
                </p>
              </div>
              <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 p-6 rounded-2xl text-center">
                <h2 className="text-neutral-500 font-medium text-[13px] mb-2">Total time</h2>
                <p className="text-[22px] font-bold text-white tabular-nums">
                  {formatLiveTime(myTotalMs)}
                </p>
              </div>
              {isGhost ? (
                <div className="col-span-2 md:col-span-1 bg-[rgba(9,9,11,0.8)] border border-dashed border-neutral-700 p-6 rounded-2xl text-center">
                  <h2 className="text-neutral-500 font-medium text-[13px] mb-2">Ghost run</h2>
                  <Ghost className="w-6 h-6 text-neutral-600 mx-auto" />
                  <p className="text-[11px] text-neutral-600 mt-2 leading-snug">
                    Nothing recorded — you had already played this blitz.
                  </p>
                </div>
              ) : (
                <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 p-6 rounded-2xl text-center">
                  <h2 className="text-neutral-500 font-medium text-[13px] mb-2">Rating</h2>
                  {rating.kind === "delta" ? (
                    <p
                      className={`text-[28px] font-[900] ${
                        rating.delta >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {rating.delta >= 0 ? "+" : ""}
                      {rating.delta}
                    </p>
                  ) : rating.kind === "pending" ? (
                    <div className="flex flex-col items-center gap-1 mt-1">
                      <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                      <p className="text-[10px] text-neutral-500">Calculating…</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[14px] font-bold text-neutral-400 leading-snug">
                        {rating.label}
                      </p>
                      {rating.hint && (
                        <p className="text-[10px] text-neutral-600 mt-1.5 leading-snug">
                          {rating.hint}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <LivePodium standings={standings} questionCount={game.questionCount} />

            <LiveStandings
              standings={standings}
              questionsScored={game.questionCount}
              highlightUid={user?.uid}
              emptyLabel="Nobody in this room was eligible to be ranked."
            />

            <LiveGhostList
              ghosts={ghosts}
              questionsScored={game.questionCount}
              highlightUid={user?.uid}
            />

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href={`/home/${game.gameId}`}
                className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-[14px] hover:bg-neutral-200 transition-all"
              >
                Review the blitz
              </Link>
              <Link
                href="/live"
                className="px-5 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 font-bold text-[14px] hover:bg-neutral-800 hover:text-white transition-all"
              >
                Back to Live
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
