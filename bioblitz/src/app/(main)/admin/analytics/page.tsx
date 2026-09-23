"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import Link from "next/link";
import { app } from "@/lib/firebase";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AdminAnalytics = {
  users: {
    totalUsers: number;
    dau: number;
    wau: number;
    mau: number;
    stickiness: number;
    week1Retention: number;
    month1Retention: number;
  };
  marketing: {
    shown: number;
    accepted: number;
    declined: number;
    acceptanceRate: number;
    declineRate: number;
    totalDecisions: number;
    sourceBreakdown: Record<string, { shown: number; accepted: number; declined: number }>;
  };
  product: {
    totalTrackedEvents: number;
    keyEvents: Record<string, number>;
    topEvents: Array<{ event: string; count: number; share: number }>;
    topSources: Array<{ source: string; count: number; share: number }>;
    topPages: Array<{ page: string; count: number; share: number }>;
    funnel: {
      heroViews: number;
      heroCtaClicks: number;
      authClicks: number;
      authSuccesses: number;
      onboardingCompleted: number;
      contestStartClicks: number;
      matriculationRate: number;
      heroToSignupRate: number;
      signupToOnboardingRate: number;
      onboardingToContestRate: number;
    };
  };
  timeline: Array<{
    day: string;
    newUsers: number;
    trackedEvents: number;
    heroViews: number;
    authSuccesses: number;
    contestStartClicks: number;
    marketingShown: number;
    marketingAccepted: number;
    marketingDeclined: number;
  }>;
};

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

function formatNumber(value: number): string {
  return integerFormatter.format(value);
}

function formatDayLabel(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <p className="text-xs tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-neutral-50">{value}</p>
      {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

type PotdRow = {
  id: string;
  date: string | null;
  title: string;
  topic: string;
  attempts: number;
  correctCount: number;
  correctRate: number | null;
  submittedBy: string | null;
};

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [potdRows, setPotdRows] = useState<PotdRow[]>([]);
  const [potdLoading, setPotdLoading] = useState(false);
  const [potdDateFrom, setPotdDateFrom] = useState("");
  const [potdDateTo, setPotdDateTo] = useState("");
  const [potdSearch, setPotdSearch] = useState("");
  const potdTableRef = useRef<HTMLDivElement>(null);

  const loadAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const auth = getAuth(app);
      const currentUser = auth.currentUser;
      const token = currentUser ? await currentUser.getIdToken() : null;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch("/api/admin/analytics", {
        headers,
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(String(payload?.error || "Failed to fetch analytics."));
      }

      setData(payload as AdminAnalytics);
      setLastUpdatedAt(new Date());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch analytics.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadPotdAnalytics = async () => {
    setPotdLoading(true);
    try {
      const auth = getAuth(app);
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const res = await fetch("/api/admin/potd-analytics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error || "Failed to load POTD analytics.");
      setPotdRows(Array.isArray(payload.potd) ? payload.potd : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load POTD analytics.");
    } finally {
      setPotdLoading(false);
    }
  };

  const exportPdf = () => {
    const rows = filteredPotdRows;
    const generatedAt = new Date().toLocaleString();
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>POTD Analytics Report</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; margin: 32px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #555; font-size: 11px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-size: 11px; letter-spacing: 0.05em; border-bottom: 2px solid #e5e7eb; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .rate { font-weight: 600; }
    .low { color: #dc2626; }
    .mid { color: #d97706; }
    .high { color: #16a34a; }
  </style>
</head>
<body>
  <h1>POTD Analytics Report</h1>
  <div class="meta">Generated ${generatedAt}${potdDateFrom || potdDateTo ? ` · Date range: ${potdDateFrom || "—"} to ${potdDateTo || "—"}` : ""}${potdSearch ? ` · Filter: "${potdSearch}"` : ""} · ${rows.length} problem${rows.length !== 1 ? "s" : ""}</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Title</th>
        <th>Topic</th>
        <th>Attempts</th>
        <th>Correct</th>
        <th>Correct %</th>
        <th>Submitted by</th>
      </tr>
    </thead>
    <tbody>
      ${rows.map((r) => {
        const rate = r.correctRate !== null ? Math.round(r.correctRate * 100) : null;
        const cls = rate === null ? "" : rate >= 60 ? "high" : rate >= 35 ? "mid" : "low";
        return `<tr>
          <td>${r.date ?? "—"}</td>
          <td>${r.title || "—"}</td>
          <td>${r.topic}</td>
          <td>${r.attempts}</td>
          <td>${r.correctCount}</td>
          <td class="rate ${cls}">${rate !== null ? `${rate}%` : "—"}</td>
          <td>${r.submittedBy ?? "—"}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  useEffect(() => {
    void loadAnalytics();
    void loadPotdAnalytics();
  }, []);

  const filteredPotdRows = useMemo(() => {
    return potdRows.filter((r) => {
      if (potdDateFrom && r.date && r.date < potdDateFrom) return false;
      if (potdDateTo && r.date && r.date > potdDateTo) return false;
      if (potdSearch) {
        const q = potdSearch.toLowerCase();
        if (
          !r.title.toLowerCase().includes(q) &&
          !r.topic.toLowerCase().includes(q) &&
          !(r.submittedBy ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [potdRows, potdDateFrom, potdDateTo, potdSearch]);

  const sourceRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.marketing.sourceBreakdown)
      .map(([source, metrics]) => ({
        source,
        ...metrics,
        decisions: metrics.accepted + metrics.declined,
        acceptanceRate: metrics.accepted + metrics.declined > 0 ? metrics.accepted / (metrics.accepted + metrics.declined) : 0,
      }))
      .sort((a, b) => b.shown - a.shown);
  }, [data]);

  const eventRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.product.keyEvents)
      .map(([eventName, count]) => ({ eventName, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const trendRows = useMemo(() => {
    if (!data) return [];
    return data.timeline.map((row) => ({
      ...row,
      label: formatDayLabel(row.day),
    }));
  }, [data]);

  const topEventRows = data?.product.topEvents ?? [];
  const topSourceRows = data?.product.topSources ?? [];
  const topPageRows = data?.product.topPages ?? [];
  const totalKeyEvents = data
    ? Object.values(data.product.keyEvents).reduce((sum, value) => sum + value, 0)
    : 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.35),_transparent_42%),linear-gradient(180deg,_#09090b_0%,_#111113_100%)] text-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-neutral-800/80 bg-neutral-950/70 p-6 shadow-2xl shadow-black/20 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs tracking-[0.35em] text-neutral-500">Admin analytics</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-50 sm:text-4xl">
              Retention, consent, and product usage in one view.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              This dashboard pulls the full analytics payload from the admin API and surfaces the
              operational metrics that matter most: audience size, consent performance, funnel
              health, and the highest-volume tracked events.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void loadAnalytics(true)}
              className="inline-flex items-center justify-center rounded-xl border border-neutral-700 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading || refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh analytics"}
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/80 px-4 py-2 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-700 hover:bg-neutral-800"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {lastUpdatedAt ? (
          <p className="mb-6 text-xs tracking-[0.25em] text-neutral-500">
            Last updated {lastUpdatedAt.toLocaleString()}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-6 text-neutral-400">
            Loading analytics...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/40 p-6 text-red-200">
            {error}
          </div>
        ) : data ? (
          <>
            <section className="mb-8 rounded-[1.75rem] border border-neutral-800 bg-neutral-950/60 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-50">Trends over time</h2>
                  <p className="text-sm text-neutral-500">A 30-day view of signups, product activity, and consent volume.</p>
                </div>
                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs tracking-[0.2em] text-neutral-500">
                  30 days
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                  <p className="mb-3 text-sm text-neutral-300">User and product growth</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="label" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                        <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: "#09090b",
                            border: "1px solid #27272a",
                            borderRadius: 12,
                            color: "#fafafa",
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="newUsers" name="New users" stroke="#f4f4f5" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="trackedEvents" name="Tracked events" stroke="#22c55e" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="contestStartClicks" name="Contest starts" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="authSuccesses" name="Auth successes" stroke="#f97316" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                  <p className="mb-3 text-sm text-neutral-300">Marketing consent over time</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendRows}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="label" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                        <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: "#09090b",
                            border: "1px solid #27272a",
                            borderRadius: 12,
                            color: "#fafafa",
                          }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="marketingShown" name="Shown" stackId="1" stroke="#a1a1aa" fill="#52525b" />
                        <Area type="monotone" dataKey="marketingAccepted" name="Accepted" stackId="1" stroke="#22c55e" fill="#16a34a" />
                        <Area type="monotone" dataKey="marketingDeclined" name="Declined" stackId="1" stroke="#ef4444" fill="#dc2626" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total users" value={formatNumber(data.users.totalUsers)} />
              <MetricCard label="Tracked events" value={formatNumber(data.product.totalTrackedEvents)} />
              <MetricCard label="Consent decisions" value={formatNumber(data.marketing.totalDecisions)} hint="Accepted + declined" />
              <MetricCard label="Hero views" value={formatNumber(data.product.funnel.heroViews)} />
            </section>

            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-[1.75rem] border border-neutral-800 bg-neutral-950/60 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-50">Users</h2>
                    <p className="text-sm text-neutral-500">Retention and activity across the installed base.</p>
                  </div>
                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs tracking-[0.2em] text-neutral-500">
                    Activity
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricCard label="DAU" value={formatNumber(data.users.dau)} />
                  <MetricCard label="WAU" value={formatNumber(data.users.wau)} />
                  <MetricCard label="MAU" value={formatNumber(data.users.mau)} />
                  <MetricCard label="Stickiness" value={formatPercent(data.users.stickiness)} hint="DAU / MAU" />
                  <MetricCard label="Week 1 retention" value={formatPercent(data.users.week1Retention)} />
                  <MetricCard label="Month 1 retention" value={formatPercent(data.users.month1Retention)} />
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-neutral-800 bg-neutral-950/60 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-50">Marketing consent</h2>
                    <p className="text-sm text-neutral-500">Popup delivery and opt-in performance.</p>
                  </div>
                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs tracking-[0.2em] text-neutral-500">
                    Consent
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <MetricCard label="Shown" value={formatNumber(data.marketing.shown)} />
                  <MetricCard label="Accepted" value={formatNumber(data.marketing.accepted)} />
                  <MetricCard label="Declined" value={formatNumber(data.marketing.declined)} />
                  <MetricCard label="Acceptance rate" value={formatPercent(data.marketing.acceptanceRate)} />
                  <MetricCard label="Decline rate" value={formatPercent(data.marketing.declineRate)} />
                  <MetricCard label="Total decisions" value={formatNumber(data.marketing.totalDecisions)} />
                </div>
              </div>
            </section>

            <section className="mb-8 rounded-[1.75rem] border border-neutral-800 bg-neutral-950/60 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-50">Product funnel</h2>
                  <p className="text-sm text-neutral-500">The path from landing page to contest participation.</p>
                </div>
                <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs tracking-[0.2em] text-neutral-500">
                  Conversion
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Hero views" value={formatNumber(data.product.funnel.heroViews)} />
                <MetricCard label="Hero CTA clicks" value={formatNumber(data.product.funnel.heroCtaClicks)} />
                <MetricCard label="Auth clicks" value={formatNumber(data.product.funnel.authClicks)} />
                <MetricCard label="Auth successes" value={formatNumber(data.product.funnel.authSuccesses)} />
                <MetricCard label="Onboarding complete" value={formatNumber(data.product.funnel.onboardingCompleted)} />
                <MetricCard label="Contest starts" value={formatNumber(data.product.funnel.contestStartClicks)} />
                <MetricCard label="Hero → sign-up" value={formatPercent(data.product.funnel.heroToSignupRate)} />
                <MetricCard label="Sign-up → onboarding" value={formatPercent(data.product.funnel.signupToOnboardingRate)} />
                <MetricCard label="Onboarding → contest" value={formatPercent(data.product.funnel.onboardingToContestRate)} />
                <MetricCard label="Matriculation" value={formatPercent(data.product.funnel.matriculationRate)} hint="Sign-in → onboarding complete" />
              </div>
            </section>

            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-[1.75rem] border border-neutral-800 bg-neutral-950/60 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-50">Key events</h2>
                    <p className="text-sm text-neutral-500">Core event counts used in the product funnel.</p>
                  </div>
                  <span className="text-sm text-neutral-500">Total: {formatNumber(totalKeyEvents)}</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {eventRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-neutral-800 px-4 py-8 text-sm text-neutral-500 sm:col-span-2">
                      No product events recorded yet.
                    </div>
                  ) : (
                    eventRows.map((row) => (
                      <div key={row.eventName} className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-neutral-300">{row.eventName}</span>
                          <span className="text-sm font-semibold text-neutral-50">{formatNumber(row.count)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-neutral-800 bg-neutral-950/60 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-50">Marketing source breakdown</h2>
                    <p className="text-sm text-neutral-500">Consent shown, accepted, and declined by source.</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                  <table className="w-full text-sm">
                    <thead className="bg-neutral-900/80 text-neutral-500">
                      <tr className="text-left">
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Shown</th>
                        <th className="px-4 py-3">Accepted</th>
                        <th className="px-4 py-3">Declined</th>
                        <th className="px-4 py-3">Acceptance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceRows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-neutral-500" colSpan={5}>
                            No marketing analytics recorded yet.
                          </td>
                        </tr>
                      ) : (
                        sourceRows.map((row) => (
                          <tr key={row.source} className="border-t border-neutral-800 text-neutral-200">
                            <td className="px-4 py-3">{row.source}</td>
                            <td className="px-4 py-3">{formatNumber(row.shown)}</td>
                            <td className="px-4 py-3">{formatNumber(row.accepted)}</td>
                            <td className="px-4 py-3">{formatNumber(row.declined)}</td>
                            <td className="px-4 py-3">{formatPercent(row.acceptanceRate)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ── POTD Analytics ───────────────────────────────────────── */}
            <section className="mb-8 rounded-[1.75rem] border border-neutral-800 bg-neutral-950/60 p-5">
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-50">POTD history</h2>
                  <p className="text-sm text-neutral-500">Per-problem attempt and accuracy stats across all published POTDs.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => void loadPotdAnalytics()}
                    disabled={potdLoading}
                    className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                  >
                    {potdLoading ? "Loading…" : "Refresh"}
                  </button>
                  <button
                    onClick={exportPdf}
                    disabled={filteredPotdRows.length === 0}
                    className="rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-1.5 text-xs text-orange-300 hover:bg-orange-500/20 disabled:opacity-40 transition-colors"
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-3">
                <input
                  type="date"
                  value={potdDateFrom}
                  onChange={(e) => setPotdDateFrom(e.target.value)}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500"
                  placeholder="From"
                  title="From date"
                />
                <input
                  type="date"
                  value={potdDateTo}
                  onChange={(e) => setPotdDateTo(e.target.value)}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500"
                  placeholder="To"
                  title="To date"
                />
                <input
                  type="text"
                  value={potdSearch}
                  onChange={(e) => setPotdSearch(e.target.value)}
                  placeholder="Search title, topic, or author…"
                  className="flex-1 min-w-48 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                />
                {(potdDateFrom || potdDateTo || potdSearch) && (
                  <button
                    onClick={() => { setPotdDateFrom(""); setPotdDateTo(""); setPotdSearch(""); }}
                    className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div ref={potdTableRef} className="overflow-x-auto rounded-2xl border border-neutral-800">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-900/80 text-neutral-500">
                    <tr className="text-left">
                      <th className="px-4 py-3 whitespace-nowrap">Date</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3 whitespace-nowrap">Topic</th>
                      <th className="px-4 py-3 whitespace-nowrap">Attempts</th>
                      <th className="px-4 py-3 whitespace-nowrap">Correct</th>
                      <th className="px-4 py-3 whitespace-nowrap">Correct %</th>
                      <th className="px-4 py-3 whitespace-nowrap">Submitted by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {potdLoading ? (
                      <tr>
                        <td className="px-4 py-6 text-neutral-500" colSpan={7}>Loading…</td>
                      </tr>
                    ) : filteredPotdRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-neutral-500" colSpan={7}>No POTD records found.</td>
                      </tr>
                    ) : (
                      filteredPotdRows.map((row) => {
                        const rate = row.correctRate !== null ? Math.round(row.correctRate * 100) : null;
                        const rateColor =
                          rate === null ? "text-neutral-500"
                          : rate >= 60 ? "text-green-400"
                          : rate >= 35 ? "text-yellow-400"
                          : "text-red-400";
                        return (
                          <tr key={row.id} className="border-t border-neutral-800 text-neutral-200 hover:bg-neutral-900/30">
                            <td className="px-4 py-3 whitespace-nowrap tabular-nums text-neutral-400">{row.date ?? "—"}</td>
                            <td className="px-4 py-3 max-w-xs truncate" title={row.title}>{row.title || "—"}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300">{row.topic}</span>
                            </td>
                            <td className="px-4 py-3 tabular-nums">{formatNumber(row.attempts)}</td>
                            <td className="px-4 py-3 tabular-nums">{formatNumber(row.correctCount)}</td>
                            <td className={`px-4 py-3 tabular-nums font-semibold ${rateColor}`}>
                              {rate !== null ? `${rate}%` : "—"}
                            </td>
                            <td className="px-4 py-3 text-neutral-400">{row.submittedBy ?? "—"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {filteredPotdRows.length > 0 && (
                <p className="mt-2 text-xs text-neutral-600 text-right">
                  {filteredPotdRows.length} of {potdRows.length} problem{potdRows.length !== 1 ? "s" : ""}
                </p>
              )}
            </section>

            <section className="mb-8 rounded-[1.75rem] border border-neutral-800 bg-neutral-950/60 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-50">Tracked product events</h2>
                  <p className="text-sm text-neutral-500">Complete event volume with top entities broken out below.</p>
                </div>
                <span className="text-sm text-neutral-500">Total events: {formatNumber(data.product.totalTrackedEvents)}</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-900/80 text-neutral-500">
                    <tr className="text-left">
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Count</th>
                      <th className="px-4 py-3">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-neutral-500" colSpan={3}>
                          No product events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      eventRows.map((row) => (
                        <tr key={row.eventName} className="border-t border-neutral-800 text-neutral-200">
                          <td className="px-4 py-3">{row.eventName}</td>
                          <td className="px-4 py-3">{formatNumber(row.count)}</td>
                          <td className="px-4 py-3">{formatPercent(data.product.totalTrackedEvents > 0 ? row.count / data.product.totalTrackedEvents : 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                  <div className="border-b border-neutral-800 px-4 py-3 text-sm text-neutral-300">Top events</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-neutral-500">
                        <tr className="text-left">
                          <th className="px-4 py-2">Event</th>
                          <th className="px-4 py-2">Count</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topEventRows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-neutral-500" colSpan={3}>No data</td>
                          </tr>
                        ) : (
                          topEventRows.slice(0, 8).map((row) => (
                            <tr key={row.event} className="border-t border-neutral-800 text-neutral-200">
                              <td className="px-4 py-2">{row.event}</td>
                              <td className="px-4 py-2">{formatNumber(row.count)}</td>
                              <td className="px-4 py-2">{formatPercent(row.share)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                  <div className="border-b border-neutral-800 px-4 py-3 text-sm text-neutral-300">Top sources</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-neutral-500">
                        <tr className="text-left">
                          <th className="px-4 py-2">Source</th>
                          <th className="px-4 py-2">Count</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSourceRows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-neutral-500" colSpan={3}>No data</td>
                          </tr>
                        ) : (
                          topSourceRows.slice(0, 8).map((row) => (
                            <tr key={row.source} className="border-t border-neutral-800 text-neutral-200">
                              <td className="px-4 py-2">{row.source}</td>
                              <td className="px-4 py-2">{formatNumber(row.count)}</td>
                              <td className="px-4 py-2">{formatPercent(row.share)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                  <div className="border-b border-neutral-800 px-4 py-3 text-sm text-neutral-300">Top pages</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-neutral-500">
                        <tr className="text-left">
                          <th className="px-4 py-2">Page</th>
                          <th className="px-4 py-2">Count</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topPageRows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-neutral-500" colSpan={3}>No data</td>
                          </tr>
                        ) : (
                          topPageRows.slice(0, 8).map((row) => (
                            <tr key={row.page} className="border-t border-neutral-800 text-neutral-200">
                              <td className="px-4 py-2">{row.page}</td>
                              <td className="px-4 py-2">{formatNumber(row.count)}</td>
                              <td className="px-4 py-2">{formatPercent(row.share)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
