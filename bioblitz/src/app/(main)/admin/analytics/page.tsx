"use client";

import { useEffect, useMemo, useState } from "react";
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
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-50">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

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

  useEffect(() => {
    void loadAnalytics();
  }, []);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(39,39,42,0.35),_transparent_42%),linear-gradient(180deg,_#09090b_0%,_#111113_100%)] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl shadow-black/20 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Admin analytics</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              Retention, consent, and product usage in one view.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              This dashboard pulls the full analytics payload from the admin API and surfaces the
              operational metrics that matter most: audience size, consent performance, funnel
              health, and the highest-volume tracked events.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void loadAnalytics(true)}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading || refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh analytics"}
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {lastUpdatedAt ? (
          <p className="mb-6 text-xs uppercase tracking-[0.25em] text-zinc-500">
            Last updated {lastUpdatedAt.toLocaleString()}
          </p>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6 text-zinc-400">
            Loading analytics...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-900/50 bg-red-950/40 p-6 text-red-200">
            {error}
          </div>
        ) : data ? (
          <>
            <section className="mb-8 rounded-[1.75rem] border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-50">Trends over time</h2>
                  <p className="text-sm text-zinc-500">A 30-day view of signups, product activity, and consent volume.</p>
                </div>
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  30 days
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="mb-3 text-sm text-zinc-300">User and product growth</p>
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

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="mb-3 text-sm text-zinc-300">Marketing consent over time</p>
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
              <div className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-50">Users</h2>
                    <p className="text-sm text-zinc-500">Retention and activity across the installed base.</p>
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
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

              <div className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-50">Marketing consent</h2>
                    <p className="text-sm text-zinc-500">Popup delivery and opt-in performance.</p>
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
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

            <section className="mb-8 rounded-[1.75rem] border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-50">Product funnel</h2>
                  <p className="text-sm text-zinc-500">The path from landing page to contest participation.</p>
                </div>
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
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
                <MetricCard label="Matriculation" value={formatPercent(data.product.funnel.matriculationRate)} hint="Hero view → onboarding complete" />
              </div>
            </section>

            <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-50">Key events</h2>
                    <p className="text-sm text-zinc-500">Core event counts used in the product funnel.</p>
                  </div>
                  <span className="text-sm text-zinc-500">Total: {formatNumber(totalKeyEvents)}</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {eventRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-800 px-4 py-8 text-sm text-zinc-500 sm:col-span-2">
                      No product events recorded yet.
                    </div>
                  ) : (
                    eventRows.map((row) => (
                      <div key={row.eventName} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-zinc-300">{row.eventName}</span>
                          <span className="text-sm font-semibold text-zinc-50">{formatNumber(row.count)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-50">Marketing source breakdown</h2>
                    <p className="text-sm text-zinc-500">Consent shown, accepted, and declined by source.</p>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-900/80 text-zinc-500">
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
                          <td className="px-4 py-4 text-zinc-500" colSpan={5}>
                            No marketing analytics recorded yet.
                          </td>
                        </tr>
                      ) : (
                        sourceRows.map((row) => (
                          <tr key={row.source} className="border-t border-zinc-800 text-zinc-200">
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

            <section className="mb-8 rounded-[1.75rem] border border-zinc-800 bg-zinc-950/60 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-50">Tracked product events</h2>
                  <p className="text-sm text-zinc-500">Complete event volume with top entities broken out below.</p>
                </div>
                <span className="text-sm text-zinc-500">Total events: {formatNumber(data.product.totalTrackedEvents)}</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-900/80 text-zinc-500">
                    <tr className="text-left">
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Count</th>
                      <th className="px-4 py-3">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-4 text-zinc-500" colSpan={3}>
                          No product events recorded yet.
                        </td>
                      </tr>
                    ) : (
                      eventRows.map((row) => (
                        <tr key={row.eventName} className="border-t border-zinc-800 text-zinc-200">
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
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-300">Top events</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-zinc-500">
                        <tr className="text-left">
                          <th className="px-4 py-2">Event</th>
                          <th className="px-4 py-2">Count</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topEventRows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-zinc-500" colSpan={3}>No data</td>
                          </tr>
                        ) : (
                          topEventRows.slice(0, 8).map((row) => (
                            <tr key={row.event} className="border-t border-zinc-800 text-zinc-200">
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

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-300">Top sources</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-zinc-500">
                        <tr className="text-left">
                          <th className="px-4 py-2">Source</th>
                          <th className="px-4 py-2">Count</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSourceRows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-zinc-500" colSpan={3}>No data</td>
                          </tr>
                        ) : (
                          topSourceRows.slice(0, 8).map((row) => (
                            <tr key={row.source} className="border-t border-zinc-800 text-zinc-200">
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

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                  <div className="border-b border-zinc-800 px-4 py-3 text-sm text-zinc-300">Top pages</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-zinc-500">
                        <tr className="text-left">
                          <th className="px-4 py-2">Page</th>
                          <th className="px-4 py-2">Count</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topPageRows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-4 text-zinc-500" colSpan={3}>No data</td>
                          </tr>
                        ) : (
                          topPageRows.slice(0, 8).map((row) => (
                            <tr key={row.page} className="border-t border-zinc-800 text-zinc-200">
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
