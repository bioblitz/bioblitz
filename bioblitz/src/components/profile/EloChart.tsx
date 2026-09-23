import {
  AreaChart,
  Area,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { EloHistoryPoint } from "@/hooks/profile/types";
import { getRatingTier } from "@/lib/rating";

const tierHexByColor: Record<string, string> = {
  red: "#f87171",
  purple: "#c084fc",
  indigo: "#818cf8",
  blue: "#22d3ee",
  cyan: "#67e8f9",
  slate: "#d4d4d8",
  neutral: "#a1a1aa",
  yellow: "#facc15",
  neutral: "#d4d4d8",
  orange: "#fb923c",
};

function getTierHex(elo: number): string {
  const tier = getRatingTier(Math.round(elo));
  return tierHexByColor[tier.color] || "#ffffff";
}

interface EloChartProps {
  eloHistory: EloHistoryPoint[];
}

export default function EloChart({ eloHistory }: EloChartProps) {
  if (eloHistory.length === 0) {
    return (
      <div className="bg-neutral-950 border border-neutral-800/50 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">Rating History</h3>
        <div className="h-64 flex items-center justify-center text-neutral-600">
          <p>No rating history yet</p>
        </div>
      </div>
    );
  }

  const elos = eloHistory.map(h => h.elo);
  const minElo = Math.min(...elos);
  const maxElo = Math.max(...elos);
  const padding = (maxElo - minElo) * 0.2 || 50;
  const chartData = eloHistory.map((point, index) => ({
    ...point,
    pointIndex: index,
    tierHex: getTierHex(point.elo),
  }));

  return (
    <div className="bg-neutral-950 border border-neutral-800/50 rounded-2xl p-6 shadow-xl overflow-hidden relative group">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white">Rating History</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.5)]" />
            <span className="text-[10px] font-medium text-neutral-400 tracking-wider">Elo</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="eloStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                {chartData.map((point, index) => {
                  const offset = chartData.length <= 1 ? "0%" : `${(index / (chartData.length - 1)) * 100}%`;
                  return (
                    <stop
                      key={`tier-stop-${point.pointIndex}`}
                      offset={offset}
                      stopColor={point.tierHex}
                    />
                  );
                })}
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#5f5f7c" strokeDasharray="4 4" opacity={0.5} />
            <XAxis
              dataKey="pointIndex"
              type="number"
              domain={[0, Math.max(chartData.length - 1, 0)]}
              allowDecimals={false}
              hide={chartData.length > 20}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 10 }}
              minTickGap={20}
              tickFormatter={(value) => {
                const idx = Number(value);
                if (!Number.isFinite(idx)) return "";
                return chartData[idx]?.date || "";
              }}
            />
            <YAxis
              hide
              domain={[Math.floor(minElo - padding), Math.ceil(maxElo + padding)]}
            />
            <Tooltip
              cursor={{ stroke: "#3f3f46", strokeWidth: 1, strokeDasharray: "4 4" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as EloHistoryPoint;
                  const tier = getRatingTier(Math.round(data.elo));
                  return (
                    <div className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                      <p className="text-[10px] font-bold text-neutral-500 tracking-tighter mb-1">{data.fullDate}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-white">{Math.round(data.elo)}</span>
                        {data.delta !== undefined && data.delta !== 0 && (
                          <span className={`text-xs font-bold ${data.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {data.delta > 0 ? '+' : ''}{Math.round(data.delta)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: getTierHex(data.elo) }}
                        />
                        <span className={`text-[11px] font-semibold ${tier.textClass}`}>
                          {tier.label}
                        </span>
                        <span className="text-[10px] text-neutral-500">{data.date}</span>
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
              stroke="url(#eloStrokeGradient)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#eloGradient)"
              animationDuration={1500}
              dot={({ cx, cy, payload }) => {
                if (typeof cx !== "number" || typeof cy !== "number") return null;
                const point = payload as EloHistoryPoint;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={getTierHex(point.elo)}
                    stroke="#18181b"
                    strokeWidth={1.4}
                  />
                );
              }}
              activeDot={({ cx, cy, payload }) => {
                if (typeof cx !== "number" || typeof cy !== "number") return null;
                const point = payload as EloHistoryPoint;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={8} fill={getTierHex(point.elo)} fillOpacity={0.18} />
                    <circle cx={cx} cy={cy} r={5.2} fill={getTierHex(point.elo)} stroke="#ffffff" strokeWidth={1.4} />
                  </g>
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
