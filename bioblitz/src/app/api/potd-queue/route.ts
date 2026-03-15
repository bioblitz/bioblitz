import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";

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
        activity: {
          attempts: activity?.attempts || 0,
          correctCount: activity?.correctCount || 0,
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
  const status = String(body?.status || "queued").trim();
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

  return NextResponse.json({ id: docRef.id });
}
