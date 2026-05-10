"use client";

import { useState } from "react";
import { Gift, RefreshCw, Trophy, Users, BarChart3, Loader2 } from "lucide-react";

type LeaderboardEntry = {
  uid: string;
  displayName: string;
  username: string;
  entries: number;
};

type DrawStats = {
  month: string;
  totalEntries: number;
  totalContributors: number;
  leaderboard: LeaderboardEntry[];
  globalStats: {
    potdPublished: number;
    potdAttempts: number;
    potdCorrect: number;
  };
};

type DrawResult = {
  winner: LeaderboardEntry;
  totalEntries: number;
  month: string;
};

function formatMonth(ym: string) {
  const [year, month] = ym.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function PotdAdminPanel({ idToken }: { idToken: string }) {
  const [stats, setStats] = useState<DrawStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [drawResult, setDrawResult] = useState<DrawResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoadingStats(true);
    setError(null);
    setDrawResult(null);
    try {
      const res = await fetch("/api/admin/potd-draw", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load stats.");
      setStats(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load stats.");
    } finally {
      setLoadingStats(false);
    }
  };

  const runDraw = async () => {
    if (!stats) return;
    if (!confirm(`Run the monthly POTD draw for ${formatMonth(stats.month)}? This will pick a winner and save the result.`)) return;
    setDrawing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/potd-draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ month: stats.month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Draw failed.");
      setDrawResult(data);
    } catch (e: any) {
      setError(e?.message || "Draw failed.");
    } finally {
      setDrawing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-white">POTD Monthly Draw</h2>
        </div>
        <button
          onClick={fetchStats}
          disabled={loadingStats}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-xs transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loadingStats ? "animate-spin" : ""}`} />
          {stats ? "Refresh" : "Load stats"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2">
          {error}
        </p>
      )}

      {!stats && !loadingStats && (
        <p className="text-sm text-zinc-600 text-center py-6">
          Click "Load stats" to view this month's submission leaderboard.
        </p>
      )}

      {loadingStats && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      )}

      {stats && (
        <>
          {/* All-time stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-semibold text-white">{stats.globalStats.potdPublished}</p>
              <p className="text-xs text-zinc-500 mt-1">Published</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-semibold text-white">{stats.globalStats.potdAttempts.toLocaleString()}</p>
              <p className="text-xs text-zinc-500 mt-1">All-time attempts</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-center">
              <p className="text-2xl font-semibold text-white">
                {stats.globalStats.potdAttempts > 0
                  ? `${Math.round((stats.globalStats.potdCorrect / stats.globalStats.potdAttempts) * 100)}%`
                  : "—"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">Correct rate</p>
            </div>
          </div>

          {/* Monthly leaderboard */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-zinc-500" />
                <p className="text-xs font-medium text-zinc-400">
                  {formatMonth(stats.month)} — {stats.totalEntries} entr{stats.totalEntries === 1 ? "y" : "ies"} from {stats.totalContributors} contributor{stats.totalContributors !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {stats.leaderboard.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-4 rounded-xl border border-dashed border-zinc-800">
                No POTD submissions with tracked authors this month yet.
              </p>
            ) : (
              <div className="space-y-2">
                {stats.leaderboard.map((entry, i) => (
                  <div
                    key={entry.uid}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/40"
                  >
                    <span className="text-sm font-bold text-zinc-600 w-5 text-center tabular-nums">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{entry.displayName}</p>
                      {entry.username && (
                        <p className="text-xs text-zinc-500">@{entry.username}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-orange-400">{entry.entries}</p>
                      <p className="text-[10px] text-zinc-600">
                        entr{entry.entries === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Draw button */}
          {stats.totalEntries > 0 && (
            <button
              onClick={runDraw}
              disabled={drawing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {drawing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trophy className="w-4 h-4" />
              )}
              {drawing ? "Drawing…" : `Run draw for ${formatMonth(stats.month)}`}
            </button>
          )}

          {/* Draw result */}
          {drawResult && (
            <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-5 text-center space-y-2">
              <Trophy className="w-6 h-6 text-orange-400 mx-auto" />
              <p className="text-xs text-orange-300 font-medium uppercase tracking-widest">Winner</p>
              <p className="text-xl font-bold text-white">{drawResult.winner.displayName}</p>
              {drawResult.winner.username && (
                <p className="text-sm text-zinc-400">@{drawResult.winner.username}</p>
              )}
              <p className="text-xs text-zinc-500 pt-1">
                {drawResult.winner.entries} entr{drawResult.winner.entries === 1 ? "y" : "ies"} out of {drawResult.totalEntries} total — drawn from {formatMonth(drawResult.month)} submissions
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
