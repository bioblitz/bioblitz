import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";

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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, any> = {};

  if (body?.title !== undefined) updates.title = String(body.title).trim();
  if (body?.question !== undefined) updates.question = String(body.question).trim();
  if (body?.topic !== undefined) updates.topic = String(body.topic).trim();
  if (body?.explanation !== undefined) updates.explanation = String(body.explanation).trim();
  if (body?.date !== undefined) updates.date = body.date ? String(body.date).trim() : null;
  if (body?.multiSelect !== undefined) updates.multiSelect = Boolean(body.multiSelect);
  if (body?.status !== undefined) updates.status = String(body.status).trim();
  if (body?.imageUrl !== undefined) updates.imageUrl = String(body.imageUrl).trim();
  if (body?.imageAlt !== undefined) updates.imageAlt = String(body.imageAlt).trim();
  if (body?.orderIndex !== undefined && Number.isFinite(Number(body.orderIndex))) {
    updates.orderIndex = Number(body.orderIndex);
  }

  if (Array.isArray(body?.options)) {
    const options = body.options
      .map((opt: any) => ({ key: String(opt.key || "").toLowerCase(), text: String(opt.text || "").trim() }))
      .filter((opt: any) => opt.key && opt.text);
    updates.options = options;
    Object.assign(updates, buildOptionFields(options));
  }

  if (Array.isArray(body?.correct)) {
    updates.correct = body.correct.map((value: unknown) => String(value).toLowerCase()).filter(Boolean);
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await adminFirestore.collection("potdQueue").doc(id).set(updates, { merge: true });
  return NextResponse.json({ message: "Queue item updated." });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const id = String(params?.id || "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  await adminFirestore.collection("potdQueue").doc(id).delete();
  return NextResponse.json({ message: "Queue item deleted." });
}
