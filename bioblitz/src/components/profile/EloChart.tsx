import { AreaChart, Area, Tooltip, ResponsiveContainer, CartesianGrid, XAxis, YAxis } from "recharts";
import { EloHistoryPoint } from "@/hooks/profile/types";

interface EloChartProps {
  eloHistory: EloHistoryPoint[];
}

export default function EloChart({ eloHistory }: EloChartProps) {
  if (eloHistory.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">Rating History</h3>
        <div className="h-64 flex items-center justify-center text-zinc-600">
          <p>No rating history yet</p>
        </div>
      </div>
    );
  }

  const elos = eloHistory.map(h => h.elo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const padding = (maxElo - minElo) * 0.2 || 50;

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-6 shadow-xl overflow-hidden relative group">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Rating History</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.5)]" />
            <span className="text-[10px] font-medium text-zinc-400 tracking-wider">Elo</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={eloHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#5f5f7c" strokeDasharray="4 4" opacity={0.5} />
            <XAxis
              dataKey="date"
              hide={eloHistory.length > 20}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              minTickGap={20}
            />
            <YAxis
              hide
              domain={[Math.floor(minElo - padding), Math.ceil(maxElo + padding)]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as EloHistoryPoint;
                  return (
                    <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter mb-1">{data.fullDate}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-white">{Math.round(data.elo)}</span>
                        {data.delta !== undefined && data.delta !== 0 && (
                          <span className={`text-xs font-bold ${data.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
              stroke="#ffffff"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#eloGradient)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
