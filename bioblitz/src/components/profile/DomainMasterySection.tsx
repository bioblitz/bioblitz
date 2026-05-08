import { BrainCircuit } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  Cell,
  CartesianGrid,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopicChartPoint {
  name: string;
  totalScore: number;
  sets: number;
  avg: number;
}

interface DomainMasterySectionProps {
  chartData: TopicChartPoint[];
  chartColors: string[];
}

export default function DomainMasterySection({
  chartData,
  chartColors,
}: DomainMasterySectionProps) {
  return (
    <div className="bg-neutral-950/50 backdrop-blur-sm border border-neutral-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl h-[42rem]">
      <div className="h-px w-full bg-neutral-800/50 shrink-0" />
      <h3 className="text-lg font-semibold text-white shrink-0 flex items-center gap-2">
        <BrainCircuit className="w-5 h-5 text-neutral-500" />
        Domain Mastery
      </h3>
      <p className="text-xs text-neutral-500 -mt-2">Cumulative Score Per Topic</p>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-neutral-600 italic">
          No blitzes played yet.
        </div>
      ) : (
        <div className="flex-1 w-full bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-4">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#27272a"
              />

              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#a1a1aa",
                  fontSize: 11,
                  fontWeight: 500,
                }}
                dy={10}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#52525b", fontSize: 10 }}
              />

              <Tooltip
                cursor={{ fill: "#27272a", opacity: 0.6 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data: any = payload[0].payload;
                    return (
                      <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                        <p className="text-white font-bold text-xs mb-2">{data.name}</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-neutral-400 text-[10px]">Total Score</span>
                            <span className="text-neutral-400 font-mono text-xs">
                              {data.totalScore.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-neutral-400 text-[10px]">Blitzes Completed</span>
                            <span className="text-white font-mono text-xs">{data.sets}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-neutral-400 text-[10px]">Avg. Score</span>
                            <span className="text-emerald-400 font-mono text-xs">
                              {data.avg.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Bar
                dataKey="totalScore"
                radius={[6, 6, 0, 0]}
                barSize={32}
                animationDuration={1500}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={chartColors[index % chartColors.length]}
                    strokeWidth={0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}