import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

type StatsPayload = {
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

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((role) => String(role).toLowerCase().trim()).filter(Boolean);
}

type DecodedIdToken = Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;

function isAdminFromClaims(claims: DecodedIdToken): boolean {
  const roles = normalizeRoles((claims as { roles?: unknown }).roles);
  const role = String((claims as { role?: unknown }).role || "").toLowerCase();
  return claims.admin === true || role === "admin" || roles.includes("admin");
}

async function requireAdmin(request: Request): Promise<void> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let decoded: DecodedIdToken | null = null;

  if (token) {
    decoded = await adminAuth.verifyIdToken(token);
  } else {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) throw new Error("Unauthorized");
    decoded = sessionUser as DecodedIdToken;
  }

  if (isAdminFromClaims(decoded)) return;

  const userDoc = await adminFirestore.collection("users").doc(decoded.uid).get();
  const roles = normalizeRoles(userDoc.data()?.roles);
  if (!roles.includes("admin")) throw new Error("Forbidden");
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null) {
    const maybe = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybe.toDate === "function") return maybe.toDate();
    if (typeof maybe.seconds === "number") return new Date(maybe.seconds * 1000);
  }
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

type SourceNode = {
  shown?: unknown;
  accepted?: unknown;
  declined?: unknown;
};

type EventNode = {
  count?: unknown;
  bySource?: Record<string, unknown>;
  byPage?: Record<string, unknown>;
};

type TimelineBucket = {
  newUsers: number;
  trackedEvents: number;
  heroViews: number;
  authSuccesses: number;
  contestStartClicks: number;
  marketingShown: number;
  marketingAccepted: number;
  marketingDeclined: number;
};

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildTimeline(days: number, endDate: Date): Record<string, TimelineBucket> {
  const buckets: Record<string, TimelineBucket> = {};
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(endDate.getTime() - offset * 24 * 60 * 60 * 1000);
    buckets[dayKey(current)] = {
      newUsers: 0,
      trackedEvents: 0,
      heroViews: 0,
      authSuccesses: 0,
      contestStartClicks: 0,
      marketingShown: 0,
      marketingAccepted: 0,
      marketingDeclined: 0,
    };
  }
  return buckets;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const timelineDays = 30;
  const timelineStart = new Date(now - (timelineDays - 1) * dayMs);
  const timelineBuckets = buildTimeline(timelineDays, new Date(now));

  let totalUsers = 0;
  let dau = 0;
  let wau = 0;
  let mau = 0;
  let week1Retention = 0;
  let month1Retention = 0;

  try {
    const usersSnap = await adminFirestore.collection("users").select("createdAt", "lastActive", "lastLogin").get();
    totalUsers = usersSnap.size;

    const active1dCutoff = now - dayMs;
    const active7dCutoff = now - 7 * dayMs;
    const active30dCutoff = now - 30 * dayMs;

    let eligibleWeek1 = 0;
    let retainedWeek1 = 0;
    let eligibleMonth1 = 0;
    let retainedMonth1 = 0;

    usersSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const createdAt = asDate(data.createdAt);
      const lastActive = asDate(data.lastActive) || asDate(data.lastLogin);

      if (!lastActive) return;
      const lastActiveMs = lastActive.getTime();
      if (lastActiveMs >= active1dCutoff) dau += 1;
      if (lastActiveMs >= active7dCutoff) wau += 1;
      if (lastActiveMs >= active30dCutoff) mau += 1;

      if (!createdAt) return;
      const createdMs = createdAt.getTime();
      const ageDays = (now - createdMs) / dayMs;

      if (createdMs >= timelineStart.getTime()) {
        const bucket = timelineBuckets[dayKey(createdAt)];
        if (bucket) {
          bucket.newUsers += 1;
        }
      }

      if (ageDays >= 7) {
        eligibleWeek1 += 1;
        if (lastActiveMs >= createdMs + 7 * dayMs) retainedWeek1 += 1;
      }

      if (ageDays >= 30) {
        eligibleMonth1 += 1;
        if (lastActiveMs >= createdMs + 30 * dayMs) retainedMonth1 += 1;
      }
    });

    week1Retention = eligibleWeek1 > 0 ? retainedWeek1 / eligibleWeek1 : 0;
    month1Retention = eligibleMonth1 > 0 ? retainedMonth1 / eligibleMonth1 : 0;
  } catch {
    // keep defaults
  }

  try {
    const eventsSnap = await adminFirestore
      .collection("analyticsEvents")
      .where("createdAt", ">=", timelineStart)
      .orderBy("createdAt", "asc")
      .select("createdAt", "event")
      .get();

    eventsSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as { createdAt?: unknown; event?: unknown };
      const createdAt = asDate(data.createdAt);
      if (!createdAt) return;
      const bucket = timelineBuckets[dayKey(createdAt)];
      if (!bucket) return;

      const event = String(data.event || "");
      bucket.trackedEvents += 1;
      if (event === "hero_page_view") bucket.heroViews += 1;
      if (event === "auth_google_success") bucket.authSuccesses += 1;
      if (event === "contest_start_click") bucket.contestStartClicks += 1;
    });
  } catch {
    // keep defaults
  }

  try {
    const marketingSnap = await adminFirestore
      .collection("marketingConsentEvents")
      .where("createdAt", ">=", timelineStart)
      .orderBy("createdAt", "asc")
      .select("createdAt", "event")
      .get();

    marketingSnap.docs.forEach((docSnap) => {
      const data = docSnap.data() as { createdAt?: unknown; event?: unknown };
      const createdAt = asDate(data.createdAt);
      if (!createdAt) return;
      const bucket = timelineBuckets[dayKey(createdAt)];
      if (!bucket) return;

      const event = String(data.event || "");
      if (event === "shown") bucket.marketingShown += 1;
      if (event === "accepted") bucket.marketingAccepted += 1;
      if (event === "declined") bucket.marketingDeclined += 1;
    });
  } catch {
    // keep defaults
  }

  let shown = 0;
  let accepted = 0;
  let declined = 0;
  const sourceBreakdown: Record<string, { shown: number; accepted: number; declined: number }> = {};

  try {
    const statsDoc = await adminFirestore.collection("analytics").doc("marketingConsent").get();
    const data = (statsDoc.data() || {}) as {
      events?: { shown?: unknown; accepted?: unknown; declined?: unknown };
      sources?: Record<string, SourceNode>;
    };

    shown = asNumber(data.events?.shown);
    accepted = asNumber(data.events?.accepted);
    declined = asNumber(data.events?.declined);

    const sources = data.sources || {};
    Object.entries(sources).forEach(([source, sourceValue]) => {
      sourceBreakdown[source] = {
        shown: asNumber(sourceValue.shown),
        accepted: asNumber(sourceValue.accepted),
        declined: asNumber(sourceValue.declined),
      };
    });
  } catch {
    // keep defaults
  }

  let totalTrackedEvents = 0;
  const keyEvents: Record<string, number> = {
    hero_page_view: 0,
    hero_cta_click: 0,
    auth_google_click: 0,
    auth_google_success: 0,
    onboarding_username_completed: 0,
    contest_start_click: 0,
    contest_resume_click: 0,
    contest_challenge_play_click: 0,
  };
  const sourceTotals: Record<string, number> = {};
  const pageTotals: Record<string, number> = {};
  let topEvents: Array<{ event: string; count: number; share: number }> = [];
  let topSources: Array<{ source: string; count: number; share: number }> = [];
  let topPages: Array<{ page: string; count: number; share: number }> = [];

  try {
    const eventsDoc = await adminFirestore.collection("analytics").doc("eventsOverview").get();
    const eventsData = (eventsDoc.data() || {}) as {
      totalEvents?: unknown;
      events?: Record<string, EventNode>;
    };

    totalTrackedEvents = asNumber(eventsData.totalEvents);
    const events = eventsData.events || {};

    Object.keys(keyEvents).forEach((eventName) => {
      keyEvents[eventName] = asNumber(events[eventName]?.count);
    });

    Object.entries(events).forEach(([eventName, eventNode]) => {
      const sourceMap = eventNode.bySource || {};
      const pageMap = eventNode.byPage || {};

      Object.entries(sourceMap).forEach(([source, count]) => {
        sourceTotals[source] = (sourceTotals[source] || 0) + asNumber(count);
      });

      Object.entries(pageMap).forEach(([page, count]) => {
        pageTotals[page] = (pageTotals[page] || 0) + asNumber(count);
      });

      const eventCount = asNumber(eventNode.count);
      if (eventCount > 0) {
        topEvents.push({
          event: eventName,
          count: eventCount,
          share: totalTrackedEvents > 0 ? eventCount / totalTrackedEvents : 0,
        });
      }
    });

    topEvents = topEvents.sort((a, b) => b.count - a.count).slice(0, 12);
    topSources = Object.entries(sourceTotals)
      .map(([source, count]) => ({
        source,
        count,
        share: totalTrackedEvents > 0 ? count / totalTrackedEvents : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    topPages = Object.entries(pageTotals)
      .map(([page, count]) => ({
        page,
        count,
        share: totalTrackedEvents > 0 ? count / totalTrackedEvents : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  } catch {
    // keep defaults
  }

  const heroViews = keyEvents.hero_page_view;
  const heroCtaClicks = keyEvents.hero_cta_click;
  const authClicks = keyEvents.auth_google_click;
  const authSuccesses = keyEvents.auth_google_success;
  const onboardingCompleted = keyEvents.onboarding_username_completed;
  const contestStartClicks = keyEvents.contest_start_click;

  const heroToSignupRate = heroViews > 0 ? authSuccesses / heroViews : 0;
  const signupToOnboardingRate = authSuccesses > 0 ? onboardingCompleted / authSuccesses : 0;
  const onboardingToContestRate = onboardingCompleted > 0 ? contestStartClicks / onboardingCompleted : 0;
  const matriculationRate = authSuccesses > 0 ? onboardingCompleted / authSuccesses : 0;

  const totalDecisions = accepted + declined;
  const payload: StatsPayload = {
    users: {
      totalUsers,
      dau,
      wau,
      mau,
      stickiness: mau > 0 ? dau / mau : 0,
      week1Retention,
      month1Retention,
    },
    marketing: {
      shown,
      accepted,
      declined,
      totalDecisions,
      acceptanceRate: totalDecisions > 0 ? accepted / totalDecisions : 0,
      declineRate: totalDecisions > 0 ? declined / totalDecisions : 0,
      sourceBreakdown,
    },
    product: {
      totalTrackedEvents,
      keyEvents,
      topEvents,
      topSources,
      topPages,
      funnel: {
        heroViews,
        heroCtaClicks,
        authClicks,
        authSuccesses,
        onboardingCompleted,
        contestStartClicks,
        matriculationRate,
        heroToSignupRate,
        signupToOnboardingRate,
        onboardingToContestRate,
      },
    },
    timeline: Object.entries(timelineBuckets).map(([day, bucket]) => ({ day, ...bucket })),
  };

  return NextResponse.json(payload);
}
