import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/auth";

type MarketingEvent = "shown" | "accepted" | "declined";

function toEvent(value: unknown): MarketingEvent | null {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "shown" || normalized === "accepted" || normalized === "declined") {
    return normalized;
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const event = toEvent(body.event);
  if (!event) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const source = String(body.source || "unknown").slice(0, 50);
  const reason = String(body.reason || "").slice(0, 80);

  const statsRef = adminFirestore.collection("analytics").doc("marketingConsent");
  const eventRef = adminFirestore.collection("marketingConsentEvents").doc();

  const increments: Record<string, admin.firestore.FieldValue> = {
    totalEvents: admin.firestore.FieldValue.increment(1),
    [`events.${event}`]: admin.firestore.FieldValue.increment(1),
    [`sources.${source}.${event}`]: admin.firestore.FieldValue.increment(1),
  };

  await Promise.all([
    statsRef.set(
      {
        ...increments,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    eventRef.set({
      uid: user.uid,
      event,
      source,
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
