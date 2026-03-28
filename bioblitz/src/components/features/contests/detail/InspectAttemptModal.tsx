import { ShieldAlert } from "lucide-react";
import { LeaderboardEntry } from "./types";
import { formatTimePlayed } from "./utils";

interface InspectAttemptModalProps {
  inspectEntry: LeaderboardEntry;
  setInspectEntry: (entry: LeaderboardEntry | null) => void;
  eloPenalty: number;
  setEloPenalty: (penalty: number) => void;
  eraseAttempt: boolean;
  setEraseAttempt: (erase: boolean) => void;
  erasing: boolean;
  handleEraseSubmission: (entry: LeaderboardEntry) => void;
}

export default function InspectAttemptModal({
  inspectEntry,
  setInspectEntry,
  eloPenalty,
  setEloPenalty,
  eraseAttempt,
  setEraseAttempt,
  erasing,
  handleEraseSubmission,
}: InspectAttemptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/80 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-bold text-white">Inspect Attempt</h2>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          <span className="text-zinc-200 font-semibold">
            {inspectEntry.username}
          </span>{" "}
          — {inspectEntry.correctCount}/{inspectEntry.totalQuestions} in{" "}
          {formatTimePlayed(inspectEntry.timeTaken)}
        </p>
        <div className="space-y-3 mb-5">
          <div className="flex justify-between items-center bg-zinc-900 rounded-xl px-4 py-3">
            <span className="text-sm text-zinc-400">Tab switches</span>
            <span
              className={`font-mono font-bold text-sm ${(inspectEntry.tabSwitchCount ?? 0) > 2 ? "text-red-400" : "text-zinc-200"}`}
            >
              {inspectEntry.tabSwitchCount ?? 0}
            </span>
          </div>
          <div className="flex justify-between items-center bg-zinc-900 rounded-xl px-4 py-3">
            <span className="text-sm text-zinc-400">Time off tab</span>
            <span
              className={`font-mono font-bold text-sm ${(inspectEntry.timeOffTab ?? 0) > 10 ? "text-red-400" : "text-zinc-200"}`}
            >
              {inspectEntry.timeOffTab ?? 0}s
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-5 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Elo deduction</span>
            <input
              type="number"
              min={0}
              value={eloPenalty}
              onChange={(e) =>
                setEloPenalty(Math.max(0, parseInt(e.target.value) || 0))
              }
              className="w-24 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white text-right font-mono focus:outline-none focus:border-zinc-500"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={eraseAttempt}
              onChange={(e) => setEraseAttempt(e.target.checked)}
              className="w-4 h-4 rounded accent-red-500 cursor-pointer"
            />
            <span className="text-sm text-zinc-300">Erase attempt</span>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setInspectEntry(null)}
            className="flex-1 py-2.5 rounded-xl text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 transition-colors text-sm font-semibold"
          >
            Close
          </button>
          <button
            onClick={() => handleEraseSubmission(inspectEntry)}
            disabled={erasing || (!eraseAttempt && eloPenalty === 0)}
            className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {erasing ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
