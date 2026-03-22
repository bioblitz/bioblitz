"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import BookmarkButton from "@/components/ui/BookmarkButton";
import Link from "next/link";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { allGames } from "@/lib/gameRoomsAll";
import { gameRoom } from "@/types";
import { getTopicColors, getTopicShortLabel } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  Crown,
  Medal,
  Loader2,
  Zap,
  Target,
  Clock,
  BarChart3,
  ArrowUp,
  Star,
  CircleDot,
  RotateCcw,
  AlertTriangle,
  ChevronRight,
  FileText,
  XCircle,
  Calendar,
  Bookmark,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

// ─── Fonts (identical to HTML mockup) ────────────────────────────────────────

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const mono = jetbrainsMono.className;

// ─── Types ───────────────────────────────────────────────────────────────────

interface EloHistoryEntry {
  elo: number;
  timestamp: any;
  gameId?: string;
  delta?: number;
}

interface SubmissionRecord {
  id: string;
  gameId: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  timeTaken: number;
  submittedAt: Timestamp;
  ranked: boolean;
  topic?: string;
}

interface TopicStat {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  blitzCount: number;
  totalAvailable: number;
  accuracyPrev: number;
  prevSampleSize: number;
}

type Verdict = "Weak" | "Developing" | "Strong" | "Dominant";

interface DayActivity {
  date: string;
  count: number;
  blitzCount: number;
  potd: boolean;
}

interface LowScoreSet {
  gameId: string;
  title: string;
  topic: string;
  accuracy: number;
  submissionId: string;
}

interface MissedQuestion {
  submissionId: string;
  gameId: string;
  gameTitle: string;
  questionIndex: number;
  date: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getVerdict(accuracy: number): Verdict {
  if (accuracy >= 80) return "Dominant";
  if (accuracy >= 60) return "Strong";
  if (accuracy >= 40) return "Developing";
  return "Weak";
}

function getVerdictStyle(verdict: Verdict) {
  switch (verdict) {
    case "Dominant":
      return {
        text: "text-emerald-300",
        bg: "bg-emerald-500/15",
        border: "border-emerald-400/40",
        ring: "#10b981",
        ringTrack: "#10b98125",
      };
    case "Strong":
      return {
        text: "text-blue-300",
        bg: "bg-blue-500/15",
        border: "border-blue-400/40",
        ring: "#3b82f6",
        ringTrack: "#3b82f625",
      };
    case "Developing":
      return {
        text: "text-amber-300",
        bg: "bg-amber-500/15",
        border: "border-amber-400/40",
        ring: "#f59e0b",
        ringTrack: "#f59e0b25",
      };
    case "Weak":
      return {
        text: "text-red-300",
        bg: "bg-red-500/15",
        border: "border-red-400/40",
        ring: "#ef4444",
        ringTrack: "#ef444425",
      };
  }
}

function toDateKey(ts: Timestamp | any): string {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Animated Counter ────────────────────────────────────────────────────────

function AnimatedNumber({
  value,
  duration = 1200,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(animate);
      else prevValue.current = value;
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString()}</span>;
}

// ─── Ring Chart ──────────────────────────────────────────────────────────────

function RingChart({
  percentage,
  size = 64,
  strokeWidth = 5,
  color,
  trackColor,
  children,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ─── Section 1: Elo ──────────────────────────────────────────────────────────

function EloSection({
  eloHistory,
  currentElo,
  globalRank,
  currentStreak,
}: {
  eloHistory: EloHistoryEntry[];
  currentElo: number;
  globalRank: number | null;
  currentStreak: number;
}) {
  const [range, setRange] = useState<30 | 60 | 90>(60);
  const cutoff = useMemo(() => daysAgo(range), [range]);

  const chartData = useMemo(
    () =>
      eloHistory
        .filter((e) => {
          const d = e.timestamp?.toDate
            ? e.timestamp.toDate()
            : new Date(e.timestamp);
          return d >= cutoff;
        })
        .map((e) => {
          const d = e.timestamp?.toDate
            ? e.timestamp.toDate()
            : new Date(e.timestamp);
          return {
            date: d.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            elo: e.elo,
            delta: e.delta,
            ts: d.getTime(),
          };
        })
        .sort((a, b) => a.ts - b.ts),
    [eloHistory, cutoff],
  );

  const peakElo = useMemo(
    () => Math.max(...eloHistory.map((e) => e.elo), 0),
    [eloHistory],
  );
  const biggestGain = useMemo(() => {
    let m = 0;
    for (const e of eloHistory) {
      if (e.delta && e.delta > m) m = e.delta;
    }
    return m;
  }, [eloHistory]);

  const elo30dAgo = useMemo(() => {
    const c = daysAgo(30);
    const b = eloHistory
      .filter((e) => {
        const d = e.timestamp?.toDate
          ? e.timestamp.toDate()
          : new Date(e.timestamp);
        return d <= c;
      })
      .sort((a, b) => {
        const da = a.timestamp?.toDate
          ? a.timestamp.toDate()
          : new Date(a.timestamp);
        const db_ = b.timestamp?.toDate
          ? b.timestamp.toDate()
          : new Date(b.timestamp);
        return db_.getTime() - da.getTime();
      });
    return b[0]?.elo || null;
  }, [eloHistory]);

  const elo30dDelta = elo30dAgo !== null ? currentElo - elo30dAgo : null;
  const isAtPeak = currentElo >= peakElo && peakElo > 0;

  return (
    <div className="relative rounded-2xl border border-zinc-800 bg-[rgba(9,9,11,0.8)] overflow-hidden h-full flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b from-violet-600/[0.08] to-transparent pointer-events-none" />

      <div className="relative p-5 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2.5">
              <motion.span
                className={`${mono} text-[48px] font-[800] text-white tabular-nums leading-none`}
                style={{ letterSpacing: "-2px" }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
              >
                <AnimatedNumber value={currentElo} />
              </motion.span>
              {elo30dDelta !== null && elo30dDelta !== 0 && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`${mono} text-[15px] font-bold tabular-nums inline-flex items-center gap-1 ${elo30dDelta > 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {elo30dDelta > 0 ? (
                    <ArrowUp className="w-[13px] h-[13px]" />
                  ) : (
                    <TrendingDown className="w-[13px] h-[13px]" />
                  )}
                  {elo30dDelta > 0 ? "+" : ""}
                  {elo30dDelta}
                </motion.span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {globalRank !== null && (
                <span
                  className={`${mono} inline-flex items-center gap-1 text-[10px] font-bold bg-violet-500/15 text-[#c4b5fd] border border-violet-500/30 px-2 py-0.5 rounded-md`}
                >
                  <Crown className="w-2.5 h-2.5" />#{globalRank}
                </span>
              )}
              {isAtPeak && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.5 }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold bg-yellow-500/15 text-[#fcd34d] border border-yellow-500/30 px-2 py-0.5 rounded-md"
                >
                  <Star className="w-2.5 h-2.5 fill-yellow-400" />
                  Peak!
                </motion.span>
              )}
              {!isAtPeak && peakElo > 0 && (
                <span
                  className={`${mono} text-[10px] font-medium text-zinc-500`}
                >
                  Peak: {peakElo}
                </span>
              )}
              {biggestGain > 0 && (
                <span
                  className={`${mono} text-[10px] font-medium text-zinc-500`}
                >
                  Best: +{biggestGain}
                </span>
              )}
              {currentStreak > 0 && (
                <span
                  className={`${mono} inline-flex items-center gap-1 text-[10px] font-bold bg-orange-500/15 text-[#fdba74] border border-orange-500/30 px-2 py-0.5 rounded-md`}
                >
                  <Flame className="w-2.5 h-2.5 fill-orange-500" />
                  {currentStreak}d
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 bg-[#18181b] border border-zinc-800 rounded-lg p-0.5">
            {([30, 60, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`${mono} px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                  range === r
                    ? "bg-[#7c3aed] text-white shadow-lg shadow-violet-600/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 pt-1 pb-3 flex-1 min-h-[160px]">
        {chartData.length < 2 ? (
          <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
            Play more ranked blitzes to see your Elo chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="eloGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="#27272a"
                tick={{ fill: "#52525b", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#27272a"
                tick={{ fill: "#52525b", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 20", "dataMax + 20"]}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  background: "#09090b",
                  border: "1px solid #27272a",
                  borderRadius: "10px",
                  fontSize: "11px",
                  color: "#fafafa",
                  fontFamily: "JetBrains Mono, monospace",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                }}
                formatter={(value: number, _: string, props: any) => {
                  const d = props.payload?.delta;
                  return [
                    d ? `${value} (${d > 0 ? "+" : ""}${d})` : value,
                    "Elo",
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="elo"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="url(#eloGradient)"
                dot={{ fill: "#8b5cf6", r: 2, strokeWidth: 0 }}
                activeDot={{
                  fill: "#a78bfa",
                  r: 4,
                  stroke: "#8b5cf6",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ─── Section 2: Activity (compact for side panel) ────────────────────────────

function ActivitySection({
  activityMap,
  currentStreak,
  longestStreak,
  totalBlitzes,
  totalQuestions,
  totalTime,
}: {
  activityMap: Map<string, DayActivity>;
  currentStreak: number;
  longestStreak: number;
  totalBlitzes: number;
  totalQuestions: number;
  totalTime: number;
}) {
  const { days, maxCount } = useMemo(() => {
    let max = 1;
    const result: { key: string; count: number; blitzCount: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const activity = activityMap.get(key);
      const count = activity?.count || 0;
      if (count > max) max = count;
      result.push({ key, count, blitzCount: activity?.blitzCount || 0 });
    }
    return { days: result, maxCount: max };
  }, [activityMap]);

  const getColor = (count: number) => {
    if (count === 0) return "bg-[rgba(24,24,27,0.8)]";
    const i = count / maxCount;
    if (i > 0.75) return "bg-violet-400";
    if (i > 0.5) return "bg-violet-500/90";
    if (i > 0.25) return "bg-violet-600/70";
    return "bg-violet-800/60";
  };

  const weeks = useMemo(() => {
    const w: (typeof days)[number][][] = [];
    for (let i = 0; i < days.length; i += 7) w.push(days.slice(i, i + 7));
    return w;
  }, [days]);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[rgba(9,9,11,0.8)] overflow-hidden h-full flex flex-col">
      {/* Streak */}
      <div className="p-4 pb-3 flex items-center gap-4 border-b border-zinc-800/60">
        <motion.div
          initial={{ rotate: -20, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.3 }}
          className="bg-orange-500/15 border border-orange-500/30 p-2 rounded-xl"
        >
          <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
        </motion.div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`${mono} text-[24px] font-[800] text-white tabular-nums leading-none`}
            >
              <AnimatedNumber value={currentStreak} duration={800} />
            </span>
            <span className="text-[12px] font-medium text-zinc-500">
              day streak
            </span>
          </div>
          <p className={`${mono} text-[10px] text-zinc-600 mt-0.5`}>
            Longest:{" "}
            <span className="text-zinc-400 font-bold">{longestStreak}</span>{" "}
            days
          </p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="p-4 pb-2 flex-1">
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) => (
                <div
                  key={`${day.key}-${di}`}
                  className={`w-[12px] h-[12px] rounded-[3px] transition-all hover:scale-[1.3] cursor-default ${getColor(day.count)}`}
                  title={`${day.key}: ${day.count} questions, ${day.blitzCount} blitz${day.blitzCount !== 1 ? "es" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-[4px] mt-2 text-[9px] text-zinc-600">
          <span>Less</span>
          {[
            "bg-[rgba(24,24,27,0.8)]",
            "bg-violet-800/60",
            "bg-violet-600/70",
            "bg-violet-500/90",
            "bg-violet-400",
          ].map((c, i) => (
            <div key={i} className={`w-[10px] h-[10px] rounded-[2px] ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Lifetime stats */}
      <div className="grid grid-cols-3 border-t border-zinc-800/60">
        {[
          {
            val: totalBlitzes,
            label: "Blitzes",
            color: "text-violet-400",
            icon: <Zap className="w-3 h-3" />,
          },
          {
            val: totalQuestions,
            label: "Questions",
            color: "text-blue-400",
            icon: <CircleDot className="w-3 h-3" />,
          },
          {
            val: -1,
            label: "Time",
            color: "text-emerald-400",
            icon: <Clock className="w-3 h-3" />,
            custom: fmtTime(totalTime),
          },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`py-3 px-2 text-center ${i < 2 ? "border-r border-zinc-800/60" : ""}`}
          >
            <div
              className={`flex items-center justify-center gap-1 ${s.color} mb-0.5`}
            >
              {s.icon}
              <span className={`${mono} text-[16px] font-[800] tabular-nums`}>
                {s.custom ?? <AnimatedNumber value={s.val} duration={1000} />}
              </span>
            </div>
            <p
              className={`${mono} text-[9px] text-zinc-600 font-bold uppercase`}
              style={{ letterSpacing: "0.1em" }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 3: Mastery ──────────────────────────────────────────────────────

function TopicBreakdownSection({ topicStats }: { topicStats: TopicStat[] }) {
  const sorted = useMemo(
    () => [...topicStats].sort((a, b) => a.accuracy - b.accuracy),
    [topicStats],
  );

  if (sorted.length === 0)
    return (
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <SectionHeader icon={<Target className="w-5 h-5" />} title="Mastery" />
        <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
          <Target className="w-8 h-8 text-zinc-800 mx-auto mb-3" />
          <p className="text-zinc-600 text-sm">
            Complete some blitzes to see your topic mastery.
          </p>
        </div>
      </motion.section>
    );

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <SectionHeader icon={<Target className="w-5 h-5" />} title="Mastery" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {sorted.map((stat, i) => {
          const verdict = getVerdict(stat.accuracy);
          const vc = getVerdictStyle(verdict);
          const delta =
            stat.prevSampleSize >= 2
              ? Math.round(stat.accuracy - stat.accuracyPrev)
              : null;

          return (
            <motion.div
              key={stat.topic}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.06, duration: 0.3 }}
              className={`relative rounded-xl border bg-[rgba(9,9,11,0.6)] p-4 transition-all hover:scale-[1.01] ${vc.border}`}
              style={{ boxShadow: `inset 0 1px 0 ${vc.ring}10` }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-10 rounded-t-xl pointer-events-none"
                style={{
                  background: `linear-gradient(180deg, ${vc.ring}08 0%, transparent 100%)`,
                }}
              />
              <div className="relative flex items-center gap-3.5">
                <RingChart
                  percentage={Math.round(stat.accuracy)}
                  size={64}
                  strokeWidth={5}
                  color={vc.ring}
                  trackColor={vc.ringTrack}
                >
                  <span className={`${mono} text-[15px] font-[800] ${vc.text}`}>
                    {Math.round(stat.accuracy)}
                  </span>
                </RingChart>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[13px] font-bold text-white truncate">
                      {stat.topic}
                    </span>
                    <span
                      className={`${mono} text-[9px] font-[800] uppercase px-1.5 py-0.5 rounded ${vc.bg} ${vc.text}`}
                      style={{ letterSpacing: "0.1em" }}
                    >
                      {verdict}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {delta !== null && delta !== 0 && (
                      <span
                        className={`${mono} text-[11px] font-bold tabular-nums flex items-center gap-0.5 ${delta > 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {delta > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {delta > 0 ? "+" : ""}
                        {delta}%
                      </span>
                    )}
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {stat.total} questions
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ─── Section 4: Weekly Snapshot (link to detailed view) ──────────────────────

function WeeklySnapshotSection({
  thisWeekStats,
}: {
  thisWeekStats: {
    blitzes: number;
    questions: number;
    correctPct: number;
    eloChange: number;
  };
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <SectionHeader
        icon={<Calendar className="w-5 h-5" />}
        title="This Week"
      />
      <div className="rounded-2xl border border-zinc-800 bg-[rgba(9,9,11,0.8)] p-5">
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            {
              val: thisWeekStats.blitzes,
              label: "Blitzes",
              color: "text-violet-400",
            },
            {
              val: thisWeekStats.questions,
              label: "Questions",
              color: "text-blue-400",
            },
            {
              val: thisWeekStats.correctPct,
              label: "Accuracy",
              color: "text-emerald-400",
              suffix: "%",
            },
            {
              val: thisWeekStats.eloChange,
              label: "Elo Change",
              color:
                thisWeekStats.eloChange >= 0
                  ? "text-emerald-400"
                  : "text-red-400",
              prefix: thisWeekStats.eloChange > 0 ? "+" : "",
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <span
                className={`${mono} text-[20px] font-[800] tabular-nums ${s.color}`}
              >
                {s.prefix || ""}
                <AnimatedNumber value={s.val} duration={800} />
                {s.suffix || ""}
              </span>
              <p
                className={`${mono} text-[9px] text-zinc-600 font-bold uppercase mt-0.5`}
                style={{ letterSpacing: "0.1em" }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
        <Link
          href="/leaderboard"
          className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-violet-400" />
            <span className="text-[13px] font-bold text-zinc-300 group-hover:text-white transition-colors">
              See where you stand on the global leaderboard
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>
      <Link
        href="/bookmarks"
        className="flex items-center justify-between p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all group mt-2"
      >
        <div className="flex items-center gap-2.5">
          <Bookmark className="w-4 h-4 text-amber-400" />
          <span className="text-[13px] font-bold text-zinc-300 group-hover:text-white transition-colors">
            View your bookmarked questions
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
      </Link>
    </motion.section>
  );
}

// ─── Section 5: Review Recommendations ───────────────────────────────────────

function ReviewSection({
  lowScoreSets,
  wrongThisWeekCount,
}: {
  lowScoreSets: LowScoreSet[];
  wrongThisWeekCount: number;
}) {
  if (lowScoreSets.length === 0 && wrongThisWeekCount === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <SectionHeader
        icon={<RotateCcw className="w-5 h-5" />}
        title="Review"
        subtitle={`${lowScoreSets.length} set${lowScoreSets.length !== 1 ? "s" : ""} to revisit`}
      />

      <div className="space-y-2.5">
        {/* Wrong questions this week callout */}
        {wrongThisWeekCount > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 flex items-center gap-3">
            <div className="bg-amber-500/15 border border-amber-500/30 p-2 rounded-lg flex-shrink-0">
              <XCircle className="w-4 h-4 text-amber-400" />
            </div>

            <div className="flex-1">
              <p className="text-[13px] font-bold text-amber-200">
                {wrongThisWeekCount} question
                {wrongThisWeekCount !== 1 ? "s" : ""} missed this week
              </p>
              <p className="text-[11px] text-amber-300/50 mt-0.5">
                Review your recent attempts to see what you got wrong.
              </p>
            </div>
          </div>
        )}

        {/* Low score sets — cube grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {lowScoreSets.map((set, i) => {
            const topicColors = getTopicColors(set.topic);
            const ringColor = set.accuracy < 40 ? "#ef4444" : "#f59e0b";
            const ringTrack = set.accuracy < 40 ? "#ef444420" : "#f59e0b20";
            const textColor =
              set.accuracy < 40 ? "text-red-400" : "text-amber-400";

            return (
              <Link
                key={`${set.gameId}-${i}`}
                href={`/home/${set.gameId}/review/${set.submissionId}`}
                className="block group"
              >
                <div className="rounded-2xl border border-zinc-800 bg-[rgba(9,9,11,0.6)] p-4 flex flex-col items-center text-center gap-3 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all aspect-square justify-center">
                  <RingChart
                    percentage={Math.round(set.accuracy)}
                    size={52}
                    strokeWidth={4}
                    color={ringColor}
                    trackColor={ringTrack}
                  >
                    <span
                      className={`${mono} text-[13px] font-[800] ${textColor}`}
                    >
                      {Math.round(set.accuracy)}
                    </span>
                  </RingChart>

                  <div className="w-full min-w-0">
                    <p className="text-[12px] font-bold text-zinc-200 truncate group-hover:text-white transition-colors">
                      {set.title}
                    </p>
                    <span
                      className={`inline-block text-[9px] font-bold uppercase tracking-wide ${topicColors.bg} px-1.5 py-0.5 rounded mt-1.5`}
                    >
                      {getTopicShortLabel(set.topic)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <span className="text-zinc-400">{icon}</span>
        <h2 className="text-[17px] font-bold text-white">{title}</h2>
      </div>
      {subtitle && (
        <span className="text-xs text-zinc-500 font-medium">{subtitle}</span>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ProgressClient() {
  const router = useRouter();
  const auth = getAuth(app);
  const db = getFirestore(app);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [eloHistory, setEloHistory] = useState<EloHistoryEntry[]>([]);
  const [allBlitzes, setAllBlitzes] = useState<gameRoom[]>([]);
  const [globalRank, setGlobalRank] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/auth");
        return;
      }
      setUser(u);
    });
    return () => unsub();
  }, [auth, router]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUserProfile(user.uid),
          fetchSubmissions(user.uid),
          fetchAllBlitzes(),
          fetchGlobalRank(user.uid),
        ]);
      } catch (err) {
        console.error("Error loading progress data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  // Refetch when user navigates back to this page
  useEffect(() => {
    if (!user) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchUserProfile(user.uid);
        fetchSubmissions(user.uid);
        fetchGlobalRank(user.uid);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [user]);

  const fetchUserProfile = async (uid: string) => {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      setUserProfile(data);
      setEloHistory(Array.isArray(data.eloHistory) ? data.eloHistory : []);
    }
  };

  const fetchSubmissions = async (uid: string) => {
    const q = query(
      collection(db, "gameSubmissions"),
      where("userId", "==", uid),
      where("status", "==", "graded"),
      orderBy("submittedAt", "desc"),
      limit(500),
    );
    const snap = await getDocs(q);
    setSubmissions(
      snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          gameId: data.gameId,
          score: data.score || 0,
          totalQuestions: data.totalQuestions || 0,
          correctCount: data.correctCount || 0,
          timeTaken: data.timeTaken || 0,
          submittedAt: data.submittedAt,
          ranked: data.ranked || false,
        };
      }),
    );
  };

  const fetchAllBlitzes = async () => {
    setAllBlitzes(await allGames());
  };

  const fetchGlobalRank = async (uid: string) => {
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      const myElo = userSnap.data()?.bElo || 0;
      const q = query(
        collection(db, "users"),
        orderBy("bElo", "desc"),
        limit(200),
      );
      const snap = await getDocs(q);
      let rank = 1;
      for (const d of snap.docs) {
        if (d.id === uid) break;
        if ((d.data().bElo || 0) > myElo) rank++;
        else break;
      }
      setGlobalRank(rank);
    } catch (err) {
      console.error("Error fetching rank:", err);
    }
  };

  // ─── Derived ───────────────────────────────────────────────────────────

  const gameMap = useMemo(() => {
    const m = new Map<string, gameRoom>();
    for (const g of allBlitzes) m.set(g.id, g);
    return m;
  }, [allBlitzes]);

  const gameTopicMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of allBlitzes) m.set(g.id, g.topic || "General");
    return m;
  }, [allBlitzes]);

  const blitzesPerTopic = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of allBlitzes) {
      const t = g.topic || "General";
      m.set(t, (m.get(t) || 0) + 1);
    }
    return m;
  }, [allBlitzes]);

  const enrichedSubmissions = useMemo(
    () =>
      submissions.map((s) => ({
        ...s,
        topic: gameTopicMap.get(s.gameId) || "General",
      })),
    [submissions, gameTopicMap],
  );

  // Ranked only — used for mastery, weekly stats, review, lifetime performance stats
  const rankedSubmissions = useMemo(
    () => enrichedSubmissions.filter((s) => s.ranked),
    [enrichedSubmissions],
  );

  const topicStats = useMemo(() => {
    const ago30 = daysAgo(30);
    const sm = new Map<
      string,
      {
        correct: number;
        total: number;
        blitzIds: Set<string>;
        correctPrev: number;
        totalPrev: number;
        blitzIdsPrev: Set<string>;
      }
    >();
    for (const s of rankedSubmissions) {
      if (!sm.has(s.topic))
        sm.set(s.topic, {
          correct: 0,
          total: 0,
          blitzIds: new Set(),
          correctPrev: 0,
          totalPrev: 0,
          blitzIdsPrev: new Set(),
        });
      const e = sm.get(s.topic)!;
      e.correct += s.correctCount;
      e.total += s.totalQuestions;
      e.blitzIds.add(s.gameId);
      const sd = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date();
      if (sd < ago30) {
        e.correctPrev += s.correctCount;
        e.totalPrev += s.totalQuestions;
        e.blitzIdsPrev.add(s.gameId);
      }
    }
    const r: TopicStat[] = [];
    for (const [topic, d] of sm) {
      const acc = d.total > 0 ? (d.correct / d.total) * 100 : 0;
      r.push({
        topic,
        correct: d.correct,
        total: d.total,
        accuracy: acc,
        blitzCount: d.blitzIds.size,
        totalAvailable: blitzesPerTopic.get(topic) || 0,
        accuracyPrev:
          d.totalPrev > 0 ? (d.correctPrev / d.totalPrev) * 100 : acc,
        prevSampleSize: d.blitzIdsPrev.size,
      });
    }
    return r;
  }, [rankedSubmissions, blitzesPerTopic]);

  // Activity heatmap uses ALL submissions (measures engagement, not performance)
  const activityMap = useMemo(() => {
    const m = new Map<string, DayActivity>();
    for (const s of enrichedSubmissions) {
      const k = toDateKey(s.submittedAt);
      if (!m.has(k))
        m.set(k, { date: k, count: 0, blitzCount: 0, potd: false });
      const e = m.get(k)!;
      e.count += s.totalQuestions;
      e.blitzCount++;
    }
    return m;
  }, [enrichedSubmissions]);

  // Lifetime stats — ranked only
  const totalBlitzes = rankedSubmissions.length;
  const totalQuestions = rankedSubmissions.reduce(
    (s, x) => s + x.totalQuestions,
    0,
  );
  const totalTime = rankedSubmissions.reduce((s, x) => s + x.timeTaken, 0);
  const longestStreak = useMemo(() => {
    let max = 0,
      cur = 0;
    for (let i = 365; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = d.toISOString().split("T")[0];
      if (activityMap.has(k)) {
        cur++;
        if (cur > max) max = cur;
      } else cur = 0;
    }
    return Math.max(max, userProfile?.streak || 0);
  }, [activityMap, userProfile]);

  // This week stats — ranked only
  const thisWeekStats = useMemo(() => {
    const weekAgo = daysAgo(7);
    const weekSubs = rankedSubmissions.filter((s) => {
      const d = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date();
      return d >= weekAgo;
    });
    const blitzes = weekSubs.length;
    const questions = weekSubs.reduce((sum, s) => sum + s.totalQuestions, 0);
    const correct = weekSubs.reduce((sum, s) => sum + s.correctCount, 0);
    const correctPct =
      questions > 0 ? Math.round((correct / questions) * 100) : 0;

    // Elo change this week
    const weekHistory = eloHistory.filter((e) => {
      const d = e.timestamp?.toDate
        ? e.timestamp.toDate()
        : new Date(e.timestamp);
      return d >= weekAgo;
    });
    const eloChange = weekHistory.reduce((sum, e) => sum + (e.delta || 0), 0);

    return { blitzes, questions, correctPct, eloChange };
  }, [rankedSubmissions, eloHistory]);

  // Low score sets (below 65%) — best attempt per game
  const lowScoreSets = useMemo(() => {
    const bestByGame = new Map<string, SubmissionRecord>();
    for (const s of submissions) {
      const existing = bestByGame.get(s.gameId);
      if (
        !existing ||
        (s.totalQuestions > 0 &&
          s.correctCount / s.totalQuestions >
            existing.correctCount / (existing.totalQuestions || 1))
      ) {
        bestByGame.set(s.gameId, s);
      }
    }

    const result: LowScoreSet[] = [];
    for (const [gameId, sub] of bestByGame) {
      const accuracy =
        sub.totalQuestions > 0
          ? (sub.correctCount / sub.totalQuestions) * 100
          : 0;
      if (accuracy < 65 && accuracy > 0) {
        const game = gameMap.get(gameId);
        result.push({
          gameId,
          title: game?.title || "Unknown Blitz",
          topic: game?.topic || "General",
          accuracy,
          submissionId: sub.id,
        });
      }
    }

    return result.sort((a, b) => a.accuracy - b.accuracy).slice(0, 8);
  }, [submissions, gameMap]);

  // Wrong questions this week
  const wrongThisWeekCount = useMemo(() => {
    const weekAgo = daysAgo(7);
    return enrichedSubmissions
      .filter((s) => {
        const d = s.submittedAt?.toDate ? s.submittedAt.toDate() : new Date();
        return d >= weekAgo;
      })
      .reduce((sum, s) => sum + (s.totalQuestions - s.correctCount), 0);
  }, [enrichedSubmissions]);

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div
        className={`${dmSans.className} min-h-screen bg-black flex items-center justify-center`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          <p className="text-zinc-500 text-sm font-medium animate-pulse">
            Loading progress...
          </p>
        </div>
      </div>
    );

  return (
    <div className={`${dmSans.className} min-h-screen bg-black text-white`}>
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center gap-3"
        >
          <div className="bg-violet-500/15 border border-violet-500/30 p-2.5 rounded-xl">
            <BarChart3 className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1
              className="text-[28px] font-[900] text-white"
              style={{ letterSpacing: "-0.02em" }}
            >
              Progress
            </h1>
            <p className="text-zinc-500 text-[13px]">
              Your performance over time.
            </p>
          </div>
        </motion.div>

        <div className="space-y-8">
          {/* Row 1: Elo (left) + Activity (right) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-stretch"
          >
            <EloSection
              eloHistory={eloHistory}
              currentElo={userProfile?.bElo || 0}
              globalRank={globalRank}
              currentStreak={userProfile?.streak || 0}
            />
            <ActivitySection
              activityMap={activityMap}
              currentStreak={userProfile?.streak || 0}
              longestStreak={longestStreak}
              totalBlitzes={totalBlitzes}
              totalQuestions={totalQuestions}
              totalTime={totalTime}
            />
          </motion.div>

          {/* Row 2: Mastery */}
          <TopicBreakdownSection topicStats={topicStats} />

          {/* Row 3: Weekly Snapshot */}
          <WeeklySnapshotSection thisWeekStats={thisWeekStats} />

          {/* Row 4: Review Recommendations */}
          <ReviewSection
            lowScoreSets={lowScoreSets}
            wrongThisWeekCount={wrongThisWeekCount}
          />
        </div>

        <div className="text-center pt-10 border-t border-zinc-900 mt-10">
          <Link
            href="/home"
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
