import { TrendingUp, TrendingDown } from "lucide-react";
import { AreaChart, Area, Tooltip, ResponsiveContainer, YAxis } from "recharts";
import { EloHistoryPoint } from "@/hooks/profile/types";

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
  const elos = eloHistory.map(h => h.elo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const padding = (maxElo - minElo) * 0.2 || 50;

  return (
    <div className="bg-neutral-950/50 backdrop-blur-sm border border-neutral-800 rounded-3xl flex flex-col shadow-xl relative overflow-hidden h-full min-h-75">
      <div className="absolute inset-0 bg-linear-to-br from-neutral-500/5 to-transparent opacity-50 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center pt-8 pb-4">
        <h3 className="text-neutral-400 text-sm font-medium uppercase tracking-wider mb-1">
          Ranked Rating
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-6xl font-bold bg-clip-text text-transparent bg-linear-to-b from-white to-neutral-400 tracking-tighter">
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
              <YAxis 
                hide 
                domain={[Math.floor(minElo - padding), Math.ceil(maxElo + padding)]} 
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as EloHistoryPoint;
                    return (
                      <div className="bg-neutral-900 border border-neutral-800 p-2 rounded-lg shadow-2xl backdrop-blur-md">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-white">{Math.round(data.elo)}</span>
                          {data.delta !== undefined && data.delta !== 0 && (
                            <span className={`text-[10px] font-bold ${data.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {data.delta > 0 ? '+' : ''}{Math.round(data.delta)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="elo"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorElo)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-600 text-sm pb-8">
            Play more games to see history
          </div>
        )}
      </div>
    </div>
  );
}