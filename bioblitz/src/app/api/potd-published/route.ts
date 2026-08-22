import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

function buildOptionFields(options: { key: string; text: string }[]) {
  const map: Record<string, string> = {};
  options.forEach((opt) => {
    const key = opt.key.toLowerCase();
    if (["a", "b", "c", "d", "e"].includes(key)) map[key] = opt.text;
  });
  return map;
}

// Creates a published POTD directly (for past/today dates without a published POTD)
export async function POST(request: Request) {
  let actingUid = "";
  try {
    const result = await requireStaffOrAdmin(request);
    actingUid = result.uid;
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const date = String(body?.date || "").trim();
  if (!date) return NextResponse.json({ error: "date is required." }, { status: 400 });

  const title = String(body?.title || "").trim();
  const question = String(body?.question || "").trim();
  if (!title || !question) {
    return NextResponse.json({ error: "title and question are required." }, { status: 400 });
  }

  const options = Array.isArray(body?.options)
    ? body.options
        .map((o: any) => ({ key: String(o.key || "").toLowerCase(), text: String(o.text || "").trim() }))
        .filter((o: any) => o.key && o.text)
    : [];

  const correct = Array.isArray(body?.correct)
    ? body.correct.map((v: unknown) => String(v).toLowerCase()).filter(Boolean)
    : [];

  // Build date-based doc ID: YYYY-M-D (no leading zeros)
  const [yr, mo, dy] = date.split("-");
  const docId = `${yr}-${parseInt(mo)}-${parseInt(dy)}`;

  await adminFirestore.collection("potd").doc(docId).set({
    title,
    question,
    explanation: String(body?.explanation || "").trim(),
    topic: String(body?.topic || "General").trim(),
    date,
    multiSelect: Boolean(body?.multiSelect),
    options,
    correct,
    ...buildOptionFields(options),
    imageUrl: String(body?.imageUrl || "").trim(),
    imageAlt: String(body?.imageAlt || "").trim(),
    publishedAt: admin.firestore.FieldValue.serverTimestamp(),
    publishedBy: actingUid,
    submittedBy: actingUid,
  });

  return NextResponse.json({ id: docId });
}
