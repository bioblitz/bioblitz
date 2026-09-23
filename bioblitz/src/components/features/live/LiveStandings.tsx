"use client";

import { LiveStanding, formatLiveTime, hasSelection } from "@/lib/liveGame";
import LiveAvatar from "./LiveAvatar";

function medal(rank: number): string | null {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

/** One square per question: green correct, red wrong, hollow not yet reached. */
function AnswerTrack({
  standing,
  upTo,
}: {
  standing: LiveStanding;
  upTo: number;
}) {
  if (upTo <= 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {Array.from({ length: upTo }).map((_, i) => {
        const answer = standing.answers[String(i)];
        const answered = !!answer && hasSelection(answer.choice);
        const graded = answer?.correct === true;
        return (
          <span
            key={i}
            title={`Question ${i + 1}`}
            className={`h-2 w-2 rounded-[3px] ${
              graded
                ? "bg-emerald-500"
                : answered
                  ? "bg-red-500/80"
                  : "bg-neutral-700"
            }`}
          />
        );
      })}
    </div>
  );
}

/**
 * Bioblitz's standard leaderboard ordering: correct answers first, cumulative
 * answer time breaking ties down to the millisecond.
 */
export default function LiveStandings({
  standings,
  questionsScored,
  highlightUid,
  limit,
  emptyLabel = "No players yet.",
}: {
  standings: LiveStanding[];
  questionsScored: number;
  highlightUid?: string;
  limit?: number;
  emptyLabel?: string;
}) {
  const rows = typeof limit === "number" ? standings.slice(0, limit) : standings;
  const highlighted =
    highlightUid && !rows.some((row) => row.uid === highlightUid)
      ? standings.find((row) => row.uid === highlightUid)
      : null;

  if (standings.length === 0) {
    return (
      <div className="bg-[rgba(9,9,11,0.8)] border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500 text-[14px]">
        {emptyLabel}
      </div>
    );
  }

  const renderRow = (standing: LiveStanding, detached = false) => {
    const isYou = standing.uid === highlightUid;
    return (
      <li
        key={standing.uid + (detached ? "-you" : "")}
        className={`flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors ${
          isYou
            ? "bg-neutral-700/30 border-neutral-500/50"
            : "bg-[rgba(24,24,27,0.5)] border-neutral-800"
        }`}
      >
        <div className="w-10 shrink-0 text-center">
          {medal(standing.rank) ? (
            <span className="text-[20px] leading-none">{medal(standing.rank)}</span>
          ) : (
            <span className="text-[14px] font-bold text-neutral-500 tabular-nums">
              #{standing.rank}
            </span>
          )}
        </div>

        <LiveAvatar name={standing.username} photoURL={standing.photoURL} size={36} />

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white truncate">
            {standing.username}
            {isYou && (
              <span className="ml-2 text-[10px] font-bold text-neutral-400 tracking-wider">
                you
              </span>
            )}
          </p>
          <AnswerTrack standing={standing} upTo={questionsScored} />
        </div>

        <div className="text-right shrink-0">
          <p className="text-[16px] font-[900] text-white tabular-nums leading-none">
            {standing.correctCount}
            <span className="text-white text-[12px]"> / {questionsScored}</span>
          </p>
          <p className="text-[12px] text-white tabular-nums mt-1">
            {formatLiveTime(standing.totalMs)}
          </p>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-2">{rows.map((row) => renderRow(row))}</ul>
      {highlighted && (
        <>
          <p className="text-center text-neutral-700 text-[14px] leading-none">···</p>
          <ul>{renderRow(highlighted, true)}</ul>
        </>
      )}
    </div>
  );
}
