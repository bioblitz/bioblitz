import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";

interface EloHistoryPoint {
  date: string;
  elo: number;
  fullDate: string;
}

interface RankedRatingCardProps {
  rating: number;
  eloHistory: EloHistoryPoint[];
  isTrendingUp: boolean;
}

export default function RankedRatingCard({
  rating,
  eloHistory,
  isTrendingUp,
}: RankedRatingCardProps) {
  return (
    <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl flex flex-col shadow-xl relative overflow-hidden h-full min-h-75">
      <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-transparent opacity-50 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center pt-8 pb-4">
        <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1">
          Ranked Rating
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-6xl font-bold bg-clip-text text-transparent bg-linear-to-b from-white to-zinc-400 tracking-tighter">
            {Math.round(rating || 0)}
          </span>
          {eloHistory.length > 1 && (
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                isTrendingUp
                  ? "bg-green-500/10 text-green-500"
                  : "bg-red-500/10 text-red-500"
              }`}
            >
              {isTrendingUp ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-full h-45 mt-auto">
        {eloHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={eloHistory} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #27272a",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#a1a1aa" }}
                labelStyle={{
                  color: "#fff",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              />
              <Area
                type="monotone"
                dataKey="elo"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorElo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-600 text-sm pb-8">
            Play more games to see history
          </div>
        )}
      </div>
    </div>
  );
}