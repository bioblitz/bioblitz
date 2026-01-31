import { AreaChart, Area, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface EloHistoryPoint {
  date: string;
  elo: number;
  fullDate: string;
}

interface EloChartProps {
  eloHistory: EloHistoryPoint[];
}

export default function EloChart({ eloHistory }: EloChartProps) {
  if (eloHistory.length === 0) {
    return (
      <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Rating History</h3>
        <div className="h-64 flex items-center justify-center text-zinc-600">
          <p>No rating history yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800/50 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Rating History</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={eloHistory}>
          <defs>
            <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              color: "#fff",
            }}
            labelStyle={{ color: "#a1a1aa" }}
            formatter={(value: any) => [Math.round(value), "Rating"]}
          />
          <Area
            type="monotone"
            dataKey="elo"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#eloGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
