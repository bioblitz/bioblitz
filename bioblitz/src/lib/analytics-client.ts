"use client";

type AnalyticsEventPayload = {
  event: string;
  source?: string;
  page?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const ANON_ID_KEY = "bb_anon_id";

function getAnonId(): string | null {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(ANON_ID_KEY);
  if (existing) return existing;

  const generated = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(ANON_ID_KEY, generated);
  return generated;
}

export async function trackAnalyticsEvent(payload: AnalyticsEventPayload): Promise<void> {
  if (typeof window === "undefined") return;
  if (!payload?.event) return;

  const body = JSON.stringify({
    ...payload,
    anonId: getAnonId(),
    path: window.location.pathname,
    ts: Date.now(),
  });

  try {
    await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Best-effort tracking.
  }
}
