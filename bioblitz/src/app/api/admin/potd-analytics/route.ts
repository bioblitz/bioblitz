import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
  const token = (request.headers.get("authorization") || "").replace("Bearer ", "");
  if (!token) throw new Error("Unauthorized");
  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminFirestore.collection("users").doc(decoded.uid).get();
  const roles: string[] = userDoc.data()?.roles ?? [];
  const isAdmin =
    decoded.admin === true ||
    roles.map((r) => String(r).toLowerCase()).includes("admin");
  if (!isAdmin) throw new Error("Forbidden");
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === "Forbidden" ? 403 : 401 });
  }

  const potdSnap = await adminFirestore
    .collection("potd")
    .orderBy("date", "desc")
    .get();

  const rows = await Promise.all(
    potdSnap.docs.map(async (doc) => {
      const data = doc.data();

      const activitySnap = await adminFirestore
        .collection("potdActivity")
        .doc(doc.id)
        .get();
      const activity = activitySnap.data() ?? {};

      const attempts: number = activity.attempts ?? 0;
      const correctCount: number = activity.correctCount ?? 0;

      // Resolve submitter display name if tracked
      let submittedByName: string | null = null;
      if (data.submittedBy && data.submittedBy !== "scheduler" && data.submittedBy !== "manual-script") {
        try {
          const userDoc = await adminFirestore.collection("users").doc(data.submittedBy).get();
          submittedByName = userDoc.data()?.displayName ?? userDoc.data()?.username ?? data.submittedBy;
        } catch {
          submittedByName = data.submittedBy;
        }
      }

      return {
        id: doc.id,
        date: typeof data.date === "string" ? data.date : null,
        title: data.title ?? "",
        topic: data.topic ?? "General",
        attempts,
        correctCount,
        correctRate: attempts > 0 ? correctCount / attempts : null,
        submittedBy: submittedByName,
      };
    })
  );

  return NextResponse.json({ potd: rows });
}
