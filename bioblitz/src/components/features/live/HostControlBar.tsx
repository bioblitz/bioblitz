"use client";

import { SkipForward } from "lucide-react";
import {
  LivePacing,
  LivePhase,
  MAX_PHASE_SECONDS,
  MIN_PHASE_SECONDS,
  phaseLabel,
} from "@/lib/liveGame";

function Stepper({
  label,
  value,
  onChange,
  min = MIN_PHASE_SECONDS,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-neutral-500 font-medium">{label}</span>
      <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="px-2 py-1 text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="px-2 text-[12px] font-bold text-neutral-200 tabular-nums w-9 text-center">
          {value}s
        </span>
        <button
          onClick={() => onChange(Math.min(MAX_PHASE_SECONDS, value + 1))}
          className="px-2 py-1 text-neutral-500 hover:text-white hover:bg-neutral-800 transition-colors"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * The host's always-visible bar: where the room is, what is coming next, and
 * the button to cut a phase short. Reveal and standings times can be retuned
 * mid-game — they only change screens that have not happened yet.
 */
export default function HostControlBar({
  phase,
  questionIndex,
  questionCount,
  pacing,
  advanceLabel,
  onAdvance,
  onPacingChange,
  busy,
}: {
  phase: LivePhase;
  questionIndex: number;
  questionCount: number;
  pacing: LivePacing;
  advanceLabel: string;
  onAdvance: () => void;
  onPacingChange: (next: Partial<LivePacing>) => void;
  busy: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-800 bg-[rgba(9,9,11,0.95)] backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-neutral-600" style={{ letterSpacing: "0.08em" }}>
            {phaseLabel(phase)}
          </span>
          {phase !== "lobby" && phase !== "final" && (
            <span className="text-[13px] font-bold text-neutral-300 tabular-nums">
              Q{questionIndex + 1}
              <span className="text-neutral-600"> / {questionCount}</span>
            </span>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Stepper
            label="Reveal"
            value={pacing.revealSeconds}
            onChange={(next) => onPacingChange({ revealSeconds: next })}
          />
          <Stepper
            label="Standings"
            value={pacing.leaderboardSeconds}
            onChange={(next) => onPacingChange({ leaderboardSeconds: next })}
          />
          <Stepper
            label="Reading"
            value={pacing.readSeconds}
            min={0}
            onChange={(next) => onPacingChange({ readSeconds: next })}
          />
        </div>

        <button
          onClick={onAdvance}
          disabled={busy}
          className="ml-auto flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-bold text-[14px] hover:bg-neutral-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {advanceLabel}
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
