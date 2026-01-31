import { TrendingUp, TrendingDown, Activity, Flame } from "lucide-react";

interface ProfileStatsProps {
  bElo: number;
  setsPlayedCount: number;
  isTrendingUp: boolean;
  streak?: number;
}

export default function ProfileStats({
  bElo,
  setsPlayedCount,
  isTrendingUp,
  streak = 0,
}: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-gradient-to-br from-violet-950/50 to-zinc-950 border border-zinc-800/50 rounded-2xl p-6 hover:border-violet-500/30 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-zinc-500 text-sm font-medium">Rating</p>
          {isTrendingUp ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
        </div>
        <p className="text-4xl font-bold text-white">{Math.round(bElo)}</p>
        <p className="text-xs text-zinc-600 mt-1">bElo Points</p>
      </div>

      <div className="bg-gradient-to-br from-blue-950/50 to-zinc-950 border border-zinc-800/50 rounded-2xl p-6 hover:border-blue-500/30 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-zinc-500 text-sm font-medium">Sets Played</p>
          <Activity className="w-4 h-4 text-blue-500" />
        </div>
        <p className="text-4xl font-bold text-white">{setsPlayedCount}</p>
        <p className="text-xs text-zinc-600 mt-1">Total Completions</p>
      </div>

      <div className="bg-gradient-to-br from-orange-950/50 to-zinc-950 border border-zinc-800/50 rounded-2xl p-6 hover:border-orange-500/30 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <p className="text-zinc-500 text-sm font-medium">Streak</p>
          <Flame className="w-4 h-4 text-orange-500" />
        </div>
        <p className="text-4xl font-bold text-white">{streak}</p>
        <p className="text-xs text-zinc-600 mt-1">Day Streak</p>
      </div>
    </div>
  );
}
