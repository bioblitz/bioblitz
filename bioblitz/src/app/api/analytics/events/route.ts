import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = 'force-dynamic';

type EventPayload = {
  event?: unknown;
  source?: unknown;
  page?: unknown;
  path?: unknown;
  anonId?: unknown;
  metadata?: unknown;
};

function sanitizeKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 64);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toFlatMetadata(metadata: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    const safeKey = sanitizeKey(key);
    if (!safeKey) return;

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[safeKey] = value;
    }
  });

  return out;
}

export async function POST(request: Request) {
  let body: EventPayload = {};
  try {
    body = (await request.json()) as EventPayload;
  } catch {
    body = {};
  }

  const eventRaw = String(body.event || "").trim();
  if (!eventRaw) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  const event = sanitizeKey(eventRaw);
  const source = sanitizeKey(String(body.source || "unknown"));
  const page = sanitizeKey(String(body.page || "unknown"));
  const path = String(body.path || "").slice(0, 180);
  const anonId = String(body.anonId || "").slice(0, 120);
  const metadata = toFlatMetadata(asRecord(body.metadata));

  const currentUser = await getCurrentUser();
  const uid = currentUser?.uid || null;

  const overviewRef = adminFirestore.collection("analytics").doc("eventsOverview");
  const eventRef = adminFirestore.collection("analyticsEvents").doc();

  const increments: Record<string, admin.firestore.FieldValue> = {
    totalEvents: admin.firestore.FieldValue.increment(1),
    [`events.${event}.count`]: admin.firestore.FieldValue.increment(1),
    [`events.${event}.bySource.${source}`]: admin.firestore.FieldValue.increment(1),
    [`events.${event}.byPage.${page}`]: admin.firestore.FieldValue.increment(1),
  };

  await Promise.all([
    overviewRef.set(
      {
        ...increments,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    eventRef.set({
      uid,
      anonId: anonId || null,
      event,
      source,
      page,
      path,
      metadata,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
