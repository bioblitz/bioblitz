"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { DM_Sans } from "next/font/google";
import { Check, Copy, Ghost, Link2 as LinkIcon, Users, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLiveGame, usePhaseCountdown } from "@/hooks/useLiveGame";
import { liveFetch } from "@/lib/liveClient";
import {
  LivePacing,
  answerProgress,
  isAnswerCorrect,
  phaseDurationSeconds,
  scoredQuestionCount,
} from "@/lib/liveGame";
import LiveAvatar from "@/components/features/live/LiveAvatar";
import LiveGhostList from "@/components/features/live/LiveGhostList";
import LivePodium from "@/components/features/live/LivePodium";
import LiveQuestionPanel from "@/components/features/live/LiveQuestionPanel";
import LiveStandings from "@/components/features/live/LiveStandings";
import PhaseClock from "@/components/features/live/PhaseClock";
import HostControlBar from "@/components/features/live/HostControlBar";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export default function LiveHostPage() {
  const { liveGameId } = useParams<{ liveGameId: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { game, players, standings, ghosts, questions, loading, missing, skewMs } =
    useLiveGame(liveGameId);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  // One advance per phase, no matter how many things try to trigger it: the
  // auto-advance timer and the host's own click can land together.
  const requestedSeq = useRef<number | null>(null);

  const isHost = !!user && !!game && game.hostId === user.uid;
  const phaseSeconds = game ? phaseDurationSeconds(game.phase, game.pacing) : null;
  const remaining = usePhaseCountdown(game?.phaseEndsAtMs ?? null, skewMs);

  const advance = useCallback(
    async (fromSeq: number) => {
      if (requestedSeq.current === fromSeq) return;
      requestedSeq.current = fromSeq;
      setBusy(true);
      try {
        await liveFetch(`/api/live/${liveGameId}/advance`, { body: { fromSeq } });
        setError(null);
      } catch (err) {
        // A dropped request must not leave the room frozen on one screen, so
        // the auto-advance timer is re-armed instead of giving up.
        requestedSeq.current = null;
        setError(err instanceof Error ? err.message : "Could not advance.");
        setRetryTick((tick) => tick + 1);
      } finally {
        setBusy(false);
      }
    },
    [liveGameId],
  );

  // A new phase means the last failure is behind us.
  useEffect(() => {
    setRetryTick(0);
  }, [game?.phaseSeq]);

  // Auto-advance when the phase's clock runs out; back off before retrying a
  // transition that failed, so a persistent error can't spin.
  useEffect(() => {
    if (!isHost || !game?.phaseEndsAtMs) return;
    const due = Math.max(0, game.phaseEndsAtMs - (Date.now() + skewMs));
    const delay = retryTick > 0 ? Math.max(due, 2000) : due;
    const seq = game.phaseSeq;
    const timer = setTimeout(() => void advance(seq), delay);
    return () => clearTimeout(timer);
  }, [isHost, game?.phaseEndsAtMs, game?.phaseSeq, skewMs, advance, retryTick]);

  const updatePacing = async (next: Partial<LivePacing>) => {
    if (!game) return;
    try {
      await liveFetch(`/api/live/${liveGameId}/settings`, {
        body: { pacing: { ...game.pacing, ...next } },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pacing.");
    }
  };

  const endRoom = async () => {
    if (!confirm("End this live blitz? Answers so far will not be recorded.")) return;
    try {
      await liveFetch(`/api/live/${liveGameId}`, { method: "DELETE" });
      router.push("/live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end the room.");
    }
  };

  /** The room's shareable URL — pasting this beats reading a code aloud. */
  const joinLink = game
    ? `${typeof window === "undefined" ? "" : window.location.origin}/live/${game.joinCode}`
    : "";

  const copy = async (what: "code" | "link") => {
    if (!game) return;
    try {
      await navigator.clipboard.writeText(
        what === "code" ? game.joinCode : joinLink,
      );
      setCopied(what);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard access can be denied; the code is on screen anyway.
    }
  };

  const question = game ? questions[game.currentQuestion] : undefined;
  const revealedAnswer = game?.revealed?.[String(game.currentQuestion)];
  const revealedSolution =
    game?.revealedSolutions?.[String(game.currentQuestion)];
  const scored = game
    ? scoredQuestionCount(game.phase, game.currentQuestion, game.questionCount)
    : 0;
  const currentIndex = game?.currentQuestion ?? 0;
  const progress = useMemo(
    () => answerProgress(players, currentIndex),
    [players, currentIndex],
  );
  const correctThisQuestion = useMemo(
    () =>
      players.filter((p) =>
        isAnswerCorrect(p.answers[String(currentIndex)]?.choice, revealedAnswer),
      ).length,
    [players, currentIndex, revealedAnswer],
  );

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

  if (!isHost) {
    return (
      <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center gap-4 px-4 text-center`}>
        <p className="text-[18px] font-bold">You&apos;re not hosting this room.</p>
        <Link href={`/live/play/${liveGameId}`} className="text-neutral-400 hover:text-white underline">
          Open the player view instead
        </Link>
      </div>
    );
  }

  const advanceLabel =
    game.phase === "lobby"
      ? "Start blitz"
      : game.phase === "leaderboard" &&
          game.currentQuestion + 1 >= game.questionCount
        ? "Show results"
        : game.phase === "reveal"
          ? "Show standings"
          : game.phase === "answering"
            ? "Close answers"
            : game.phase === "reading"
              ? "Reveal choices"
              : "Next question";

  return (
    <div className={`${dmSans.className} min-h-screen bg-neutral-900 text-white pt-24 pb-28`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] font-bold text-neutral-600 mb-1" style={{ letterSpacing: "0.1em" }}>
              Hosting
            </p>
            <h1 className="text-[28px] md:text-[32px] font-[900] text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>
              {game.gameTitle}
            </h1>
            <div className="h-[3px] w-20 bg-neutral-600 rounded-full mt-2" />
          </div>
          {game.status !== "ended" && (
            <button
              onClick={endRoom}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-800 text-neutral-400 text-[13px] font-bold hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all shrink-0"
            >
              <X className="w-3.5 h-3.5" /> End room
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {error}
          </div>
        )}

        {game.status === "cancelled" && (
          <div className="mb-6 rounded-xl border border-neutral-800 bg-[rgba(9,9,11,0.8)] px-4 py-3 text-[13px] text-neutral-400">
            This room was ended early. Nothing was recorded.
          </div>
        )}

        {/* ---------------- Lobby ---------------- */}
        {game.phase === "lobby" && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] items-start">
            <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-8 text-center">
              <p className="text-neutral-500 text-[13px] font-medium mb-3" style={{ letterSpacing: "0.08em" }}>
                Join at /live with code
              </p>
              <p className="text-[56px] md:text-[80px] font-[900] text-white leading-none tracking-[0.12em] tabular-nums">
                {game.joinCode}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => copy("code")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-800 text-neutral-400 text-[13px] font-bold hover:text-white hover:border-neutral-600 transition-all"
                >
                  {copied === "code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied === "code" ? "Copied" : "Copy code"}
                </button>
                <button
                  onClick={() => copy("link")}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-800 text-neutral-400 text-[13px] font-bold hover:text-white hover:border-neutral-600 transition-all"
                >
                  {copied === "link" ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                  {copied === "link" ? "Copied" : "Copy join link"}
                </button>
              </div>
              <p className="mt-3 text-[12px] text-neutral-600">
                Anyone who opens the link signs in and lands straight in this room.
              </p>
              <p className="mt-6 text-[13px] text-neutral-600 max-w-md mx-auto leading-relaxed">
                {game.questionCount} questions · {game.pacing.secondsPerQuestion}s each.
                First-timers are ranked and rated; anyone who has played this
                blitz before joins as a ghost and answers along unranked.
              </p>
            </div>

            <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-neutral-500" />
                <h2 className="text-[15px] font-bold text-white">
                  Players
                  <span className="text-neutral-600"> · {players.length}</span>
                </h2>
              </div>
              {ghosts.length > 0 && (
                <p className="text-[12px] text-neutral-600 mb-3 -mt-1">
                  {players.length - ghosts.length} ranked · {ghosts.length} ghost
                  {ghosts.length === 1 ? "" : "s"}
                </p>
              )}
              {players.length === 0 ? (
                <p className="text-[13px] text-neutral-600 py-6 text-center">
                  Waiting for players to join...
                </p>
              ) : (
                <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {players.map((player) => (
                    <li key={player.uid} className="flex items-center gap-3">
                      <LiveAvatar
                        name={player.username}
                        photoURL={player.photoURL}
                        size={32}
                        className={player.ghost ?"opacity-60" :""}
                      />
                      <span
                        className={`text-[14px] truncate ${
                          player.ghost ? "text-neutral-500" : "text-neutral-200"
                        }`}
                      >
                        {player.username}
                      </span>
                      {player.ghost && (
                        <Ghost
                          className="w-3.5 h-3.5 text-neutral-600 ml-auto shrink-0"
                          aria-label="Playing as a ghost"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ---------------- In play ---------------- */}
        {(game.phase === "reading" ||
          game.phase === "answering" ||
          game.phase === "reveal") &&
          question && (
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_200px] items-start">
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
                correct={game.phase === "reveal" ? revealedAnswer : undefined}
                solution={game.phase === "reveal" ? revealedSolution : undefined}
              />

              <div className="flex flex-col items-center gap-5">
                {remaining !== null && phaseSeconds !== null && (
                  <PhaseClock
                    remainingSeconds={remaining}
                    totalSeconds={phaseSeconds}
                    label={game.phase === "reading" ? "Read" : game.phase === "reveal" ? "Reveal" : "Answer"}
                    urgent={game.phase === "answering"}
                  />
                )}

                <div className="w-full bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-4 text-center">
                  {game.phase === "reveal" ? (
                    <>
                      <p className="text-[28px] font-[900] text-emerald-400 leading-none">
                        {correctThisQuestion}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1.5">
                        of {players.length} got it right
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[28px] font-[900] text-white leading-none tabular-nums">
                        {progress.answered}
                        <span className="text-neutral-600 text-[16px]"> / {players.length}</span>
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-1.5">
                        answered · {progress.locked} locked in
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* ---------------- Between-question standings ---------------- */}
        {game.phase === "leaderboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-[900] text-white" style={{ letterSpacing: "-0.02em" }}>
                Standings after question {game.currentQuestion + 1}
              </h2>
              {remaining !== null && phaseSeconds !== null && (
                <PhaseClock
                  remainingSeconds={remaining}
                  totalSeconds={phaseSeconds}
                  label="Next"
                  size={84}
                />
              )}
            </div>
            <LiveStandings standings={standings} questionsScored={scored} limit={10} />
            <LiveGhostList ghosts={ghosts} questionsScored={scored} />
          </div>
        )}

        {/* ---------------- Results ---------------- */}
        {game.phase === "final" && game.status !== "cancelled" && (
          <div className="space-y-10">
            <div className="text-center">
              <h2 className="text-[26px] md:text-[32px] font-[900] text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
                Final standings
              </h2>
              <p className="text-neutral-500 text-[14px]">
                Ranked by correct answers, then total time to answer.
              </p>
            </div>

            <LivePodium standings={standings} questionCount={game.questionCount} />

            <LiveStandings
              standings={standings}
              questionsScored={game.questionCount}
              emptyLabel="Nobody in this room was eligible to be ranked."
            />

            <LiveGhostList ghosts={ghosts} questionsScored={game.questionCount} />

            <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-6 text-center">
              <p className="text-[13px] text-neutral-400">
                Every ranked run has been filed as a normal attempt — Elo, stats
                and the blitz leaderboard update within a few seconds.
                {ghosts.length > 0 &&
                  ` The ${ghosts.length} ghost${
                    ghosts.length === 1 ? "" : "s"
                  } played along without anything being recorded.`}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/home/${game.gameId}`}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-[14px] hover:bg-neutral-200 transition-all"
                >
                  Open the blitz
                </Link>
                <Link
                  href="/live"
                  className="px-5 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 font-bold text-[14px] hover:bg-neutral-800 hover:text-white transition-all"
                >
                  Host another
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {game.phase !== "final" && game.status !== "cancelled" && (
        <HostControlBar
          phase={game.phase}
          questionIndex={game.currentQuestion}
          questionCount={game.questionCount}
          pacing={game.pacing}
          advanceLabel={advanceLabel}
          onAdvance={() => void advance(game.phaseSeq)}
          onPacingChange={updatePacing}
          busy={busy}
        />
      )}
    </div>
  );
}
