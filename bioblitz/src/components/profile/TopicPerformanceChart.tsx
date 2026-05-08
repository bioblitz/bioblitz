import { BarChart, Bar, XAxis, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface TopicData {
  name: string;
  avg: number;
  totalScore: number;
  sets: number;
}

interface TopicPerformanceChartProps {
  chartData: TopicData[];
}

const CHART_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
];

export default function TopicPerformanceChart({ chartData }: TopicPerformanceChartProps) {
  if (chartData.length === 0) {
    return (
      <div className="bg-neutral-950 border border-neutral-800/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Performance by Topic</h3>
        <div className="h-64 flex items-center justify-center text-neutral-600">
          <p>No performance data yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 border border-neutral-800/50 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">Performance by Topic</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData}>
          <XAxis
            dataKey="name"
            tick={{ fill: "#71717a", fontSize: 12 }}
            axisLine={{ stroke: "#3f3f46" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              color: "#fff",
            }}
            cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
            formatter={(value: any, name?: string, props?: any) => [
              `${value}% avg`,
              `${props?.payload?.sets || 0} set${props?.payload?.sets !== 1 ? "s" : ""}`,
            ]}
          />
          <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
