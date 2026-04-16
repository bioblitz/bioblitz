"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuth } from "firebase/auth";
import Link from "next/link";
import { app } from "@/lib/firebase";

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
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = await getAuth(app).currentUser?.getIdToken();
        const headers: HeadersInit = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const response = await fetch("/api/admin/analytics", {
          headers,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(String(payload?.error || "Failed to fetch analytics."));
        }
        setData(payload as AdminAnalytics);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch analytics.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const sourceRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.marketing.sourceBreakdown)
      .map(([source, metrics]) => ({ source, ...metrics }))
      .sort((a, b) => b.shown - a.shown);
  }, [data]);

  const eventRows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.product.keyEvents)
      .map(([eventName, count]) => ({ eventName, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  return (
    <div className="min-h-screen bg-neutral-900 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="flex items-center justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-zinc-400 mt-1">User retention and marketing conversion overview.</p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-zinc-300 hover:text-white transition-colors"
          >
            Back to Admin
          </Link>
        </div>

        {loading ? (
          <div className="text-zinc-400">Loading analytics...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : data ? (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">Product Funnel</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Hero Views</p>
                  <p className="text-2xl font-bold mt-1">{data.product.funnel.heroViews}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Sign-in Successes</p>
                  <p className="text-2xl font-bold mt-1">{data.product.funnel.authSuccesses}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Onboarding Completed</p>
                  <p className="text-2xl font-bold mt-1">{data.product.funnel.onboardingCompleted}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Matriculation Rate</p>
                  <p className="text-2xl font-bold mt-1">{formatPercent(data.product.funnel.matriculationRate)}</p>
                  <p className="text-xs text-zinc-500 mt-1">Hero view → onboarding complete</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Hero → Sign-up</p>
                  <p className="text-2xl font-bold mt-1">{formatPercent(data.product.funnel.heroToSignupRate)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Onboarding → Contest Start</p>
                  <p className="text-2xl font-bold mt-1">{formatPercent(data.product.funnel.onboardingToContestRate)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <p className="text-sm text-zinc-300 mb-3">Funnel Steps</p>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                  <div className="rounded-lg border border-zinc-800 p-3">
                    <p className="text-zinc-500">Hero Views</p>
                    <p className="text-lg font-semibold mt-1">{data.product.funnel.heroViews}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 p-3">
                    <p className="text-zinc-500">Hero CTA Clicks</p>
                    <p className="text-lg font-semibold mt-1">{data.product.funnel.heroCtaClicks}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 p-3">
                    <p className="text-zinc-500">Auth Clicks</p>
                    <p className="text-lg font-semibold mt-1">{data.product.funnel.authClicks}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 p-3">
                    <p className="text-zinc-500">Auth Successes</p>
                    <p className="text-lg font-semibold mt-1">{data.product.funnel.authSuccesses}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 p-3">
                    <p className="text-zinc-500">Onboarding Done</p>
                    <p className="text-lg font-semibold mt-1">{data.product.funnel.onboardingCompleted}</p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 p-3">
                    <p className="text-zinc-500">Contest Starts</p>
                    <p className="text-lg font-semibold mt-1">{data.product.funnel.contestStartClicks}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-3">User Analytics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Total Users</p>
                  <p className="text-2xl font-bold mt-1">{data.users.totalUsers}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">DAU / WAU / MAU</p>
                  <p className="text-2xl font-bold mt-1">{data.users.dau} / {data.users.wau} / {data.users.mau}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Stickiness</p>
                  <p className="text-2xl font-bold mt-1">{formatPercent(data.users.stickiness)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Week 1 Retention</p>
                  <p className="text-2xl font-bold mt-1">{formatPercent(data.users.week1Retention)}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Month 1 Retention</p>
                  <p className="text-2xl font-bold mt-1">{formatPercent(data.users.month1Retention)}</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Marketing Consent Analytics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Popup Shown</p>
                  <p className="text-2xl font-bold mt-1">{data.marketing.shown}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Accepted / Declined</p>
                  <p className="text-2xl font-bold mt-1">{data.marketing.accepted} / {data.marketing.declined}</p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Acceptance Rate</p>
                  <p className="text-2xl font-bold mt-1">{formatPercent(data.marketing.acceptanceRate)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 text-sm text-zinc-300">By Source</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500">
                        <th className="px-4 py-2">Source</th>
                        <th className="px-4 py-2">Shown</th>
                        <th className="px-4 py-2">Accepted</th>
                        <th className="px-4 py-2">Declined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sourceRows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-3 text-zinc-500" colSpan={4}>
                            No marketing analytics recorded yet.
                          </td>
                        </tr>
                      ) : (
                        sourceRows.map((row) => (
                          <tr key={row.source} className="border-t border-zinc-800 text-zinc-200">
                            <td className="px-4 py-2">{row.source}</td>
                            <td className="px-4 py-2">{row.shown}</td>
                            <td className="px-4 py-2">{row.accepted}</td>
                            <td className="px-4 py-2">{row.declined}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-lg font-semibold mb-3">Tracked Product Events</h2>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 text-sm text-zinc-300 flex items-center justify-between">
                  <span>Event Volume</span>
                  <span className="text-zinc-500">Total: {data.product.totalTrackedEvents}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500">
                        <th className="px-4 py-2">Event</th>
                        <th className="px-4 py-2">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventRows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-3 text-zinc-500" colSpan={2}>
                            No product events recorded yet.
                          </td>
                        </tr>
                      ) : (
                        eventRows.map((row) => (
                          <tr key={row.eventName} className="border-t border-zinc-800 text-zinc-200">
                            <td className="px-4 py-2">{row.eventName}</td>
                            <td className="px-4 py-2">{row.count}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 text-sm text-zinc-300">Top Events</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-zinc-500">
                          <th className="px-4 py-2">Event</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.product.topEvents.length === 0 ? (
                          <tr>
                            <td className="px-4 py-3 text-zinc-500" colSpan={2}>No data</td>
                          </tr>
                        ) : (
                          data.product.topEvents.slice(0, 8).map((row) => (
                            <tr key={row.event} className="border-t border-zinc-800 text-zinc-200">
                              <td className="px-4 py-2">{row.event}</td>
                              <td className="px-4 py-2">{formatPercent(row.share)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 text-sm text-zinc-300">Top Sources</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-zinc-500">
                          <th className="px-4 py-2">Source</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.product.topSources.length === 0 ? (
                          <tr>
                            <td className="px-4 py-3 text-zinc-500" colSpan={2}>No data</td>
                          </tr>
                        ) : (
                          data.product.topSources.slice(0, 8).map((row) => (
                            <tr key={row.source} className="border-t border-zinc-800 text-zinc-200">
                              <td className="px-4 py-2">{row.source}</td>
                              <td className="px-4 py-2">{formatPercent(row.share)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 text-sm text-zinc-300">Top Pages</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-zinc-500">
                          <th className="px-4 py-2">Page</th>
                          <th className="px-4 py-2">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.product.topPages.length === 0 ? (
                          <tr>
                            <td className="px-4 py-3 text-zinc-500" colSpan={2}>No data</td>
                          </tr>
                        ) : (
                          data.product.topPages.slice(0, 8).map((row) => (
                            <tr key={row.page} className="border-t border-zinc-800 text-zinc-200">
                              <td className="px-4 py-2">{row.page}</td>
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
