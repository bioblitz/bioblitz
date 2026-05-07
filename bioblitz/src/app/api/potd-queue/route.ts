import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";

export const dynamic = 'force-dynamic';

function getTodayPstDateKey(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function isPastPstDate(date: string | null | undefined): boolean {
  if (!date) return false;
  return date < getTodayPstDateKey();
}

async function archiveReplacedQueueItems(date: string, keepId: string) {
  const sameDateSnap = await adminFirestore
    .collection("potdQueue")
    .where("date", "==", date)
    .where("status", "in", ["queued", "scheduled", "published"])
    .get();

  if (sameDateSnap.empty) return;

  const batch = adminFirestore.batch();
  let updates = 0;

  sameDateSnap.docs.forEach((docSnap) => {
    if (docSnap.id === keepId) return;
    batch.set(
      docSnap.ref,
      {
        status: "archived",
        archivedAt: admin.firestore.FieldValue.serverTimestamp(),
        archiveReason: "replaced_by_same_day_schedule",
        replacedBy: keepId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    updates += 1;
  });

  if (updates > 0) {
    await batch.commit();
  }
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).toLowerCase()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim().toLowerCase()];
  }
  return [];
}

function buildOptionFields(options: { key: string; text: string }[]) {
  const map: Record<string, string> = {};
  options.forEach((opt) => {
    if (!opt.key) return;
    const key = opt.key.toLowerCase();
    if (["a", "b", "c", "d", "e"].includes(key)) {
      map[key] = opt.text;
    }
  });
  return map;
}

export async function GET(request: Request) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const queueSnap = await adminFirestore
    .collection("potdQueue")
    .orderBy("orderIndex", "asc")
    .get();

  const todayPst = getTodayPstDateKey();
  const autoArchiveBatch = adminFirestore.batch();
  let archiveUpdates = 0;
  const statusById = new Map<string, string>();

  queueSnap.docs.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const date = typeof data?.date === "string" ? data.date : null;
    const currentStatus = String(data?.status || "queued");
    if (date && date < todayPst && currentStatus !== "archived") {
      statusById.set(docSnap.id, "archived");
      autoArchiveBatch.set(
        docSnap.ref,
        {
          status: "archived",
          archivedAt: admin.firestore.FieldValue.serverTimestamp(),
          archiveReason: "past_date",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      archiveUpdates += 1;
    }
  });

  if (archiveUpdates > 0) {
    await autoArchiveBatch.commit();
  }

  const queue = await Promise.all(
    queueSnap.docs.map(async (docSnap) => {
      const data = docSnap.data() as any;
      const activitySnap = await adminFirestore
        .collection("potdActivity")
        .doc(docSnap.id)
        .get();
      const activity = activitySnap.exists ? activitySnap.data() : {};

      return {
        id: docSnap.id,
        ...data,
        status: statusById.get(docSnap.id) || data?.status || "queued",
        activity: {
          attempts: activity?.attempts || 0,
          correctCount: activity?.correctCount || 0,
          answeredUserIds: Array.isArray(activity?.answeredUserIds) ? activity.answeredUserIds : [],
          correctUserIds: Array.isArray(activity?.correctUserIds) ? activity.correctUserIds : [],
          lastPlayedAt: activity?.lastPlayedAt?.toDate?.()?.toISOString?.() || null,
        },
      };
    })
  );

  return NextResponse.json({ queue });
}

export async function POST(request: Request) {
  let actingUid = "";
  try {
    const admin = await requireStaffOrAdmin(request);
    actingUid = admin.uid;
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const title = String(body?.title || "").trim();
  const question = String(body?.question || "").trim();
  const topic = String(body?.topic || "General").trim();
  const explanation = String(body?.explanation || "").trim();
  const imageUrl = String(body?.imageUrl || "").trim();
  const imageAlt = String(body?.imageAlt || "").trim();
  const date = body?.date ? String(body?.date).trim() : null;
  const multiSelect = Boolean(body?.multiSelect);
  let status = String(body?.status || "queued").trim();
  const optionsInput = Array.isArray(body?.options) ? body.options : [];
  const options = optionsInput
    .map((opt: any) => ({ key: String(opt.key || "").toLowerCase(), text: String(opt.text || "").trim() }))
    .filter((opt: any) => opt.key && opt.text);
  const correct = toArray(body?.correct);

  if (!title || !question || options.length < 2) {
    return NextResponse.json(
      { error: "Title, question, and at least two options are required." },
      { status: 400 }
    );
  }

  const optionFields = buildOptionFields(options);

  let orderIndex = Number(body?.orderIndex);
  if (!Number.isFinite(orderIndex)) {
    const lastSnap = await adminFirestore
      .collection("potdQueue")
      .orderBy("orderIndex", "desc")
      .limit(1)
      .get();
    orderIndex = lastSnap.empty ? 0 : (lastSnap.docs[0].data()?.orderIndex || 0) + 1;
  }

  const docRef = adminFirestore.collection("potdQueue").doc();
  if (isPastPstDate(date)) {
    status = "archived";
  }

  await docRef.set({
    title,
    question,
    topic,
    explanation,
    date,
    multiSelect,
    options,
    correct,
    status,
    orderIndex,
    imageUrl,
    imageAlt,
    ...optionFields,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: actingUid,
  });

  if (date && status !== "archived") {
    await archiveReplacedQueueItems(date, docRef.id);
  }

  return NextResponse.json({ id: docRef.id });
}
