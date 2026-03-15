import { NextResponse } from "next/server";
import admin, { adminFirestore } from "@/lib/firebase-admin";
import { requireStaffOrAdmin } from "@/lib/adminAccess";

export async function POST(request: Request) {
  try {
    await requireStaffOrAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const orderedIds = Array.isArray(body?.orderedIds)
    ? body.orderedIds.map((id: unknown) => String(id)).filter(Boolean)
    : [];

  if (orderedIds.length === 0) {
    return NextResponse.json({ error: "Missing orderedIds." }, { status: 400 });
  }

  const batch = adminFirestore.batch();
  orderedIds.forEach((id: string, index: number) => {
    const ref = adminFirestore.collection("potdQueue").doc(id);
    batch.set(
      ref,
      {
        orderIndex: index,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  await batch.commit();
  return NextResponse.json({ message: "Order updated." });
}
