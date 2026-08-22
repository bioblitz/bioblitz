import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));

  const monthStr = String(month).padStart(2, "0");
  const monthStart = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const [publishedSnap, queuedSnap] = await Promise.all([
    adminFirestore
      .collection("potd")
      .where("date", ">=", monthStart)
      .where("date", "<=", monthEnd)
      .get(),
    adminFirestore
      .collection("potdQueue")
      .where("date", ">=", monthStart)
      .where("date", "<=", monthEnd)
      .get(),
  ]);

  const published = publishedSnap.docs.map((doc) => {
    const fd = doc.data();
    return {
      id: doc.id,
      date: fd.date || "",
      title: fd.title || "",
      topic: fd.topic || "",
      question: fd.question || "",
      explanation: fd.explanation || "",
      options: fd.options || [],
      correct: fd.correct || [],
      multiSelect: fd.multiSelect || false,
      imageUrl: fd.imageUrl || "",
      imageAlt: fd.imageAlt || "",
      a: fd.a, b: fd.b, c: fd.c, d: fd.d, e: fd.e,
    };
  });

  const queued = queuedSnap.docs
    .filter((doc) => ["queued", "scheduled"].includes(doc.data().status || "queued"))
    .map((doc) => {
      const fd = doc.data();
      return {
        id: doc.id,
        date: fd.date || "",
        title: fd.title || "",
        topic: fd.topic || "",
        status: fd.status || "queued",
        question: fd.question || "",
        explanation: fd.explanation || "",
        options: fd.options || [],
        correct: fd.correct || [],
        multiSelect: fd.multiSelect || false,
        imageUrl: fd.imageUrl || "",
        imageAlt: fd.imageAlt || "",
        a: fd.a, b: fd.b, c: fd.c, d: fd.d, e: fd.e,
      };
    });

  return NextResponse.json({ published, queued });
}
