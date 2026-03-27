import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => String(r).toLowerCase().trim()).filter(Boolean);
}

async function requireAdmin(request: Request): Promise<void> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Unauthorized");

  const decoded = await adminAuth.verifyIdToken(token);
  const roles = normalizeRoles(decoded?.roles);
  let admin =
    decoded?.admin === true ||
    decoded?.role === "admin" ||
    roles.includes("admin");

  if (!admin) {
    const userDoc = await adminFirestore.collection("users").doc(decoded.uid).get();
    admin = normalizeRoles(userDoc.data()?.roles).includes("admin");
  }

  if (!admin) throw new Error("Forbidden");
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const submissionId = String(body?.submissionId || "").trim();
  const userId = String(body?.userId || "").trim();
  const eloPenalty = typeof body?.eloPenalty === "number" ? Math.max(0, body.eloPenalty) : 0;
  const eraseAttempt = body?.eraseAttempt !== false;

  if (!submissionId || !userId) {
    return NextResponse.json({ error: "Missing submissionId or userId" }, { status: 400 });
  }

  if (!eraseAttempt && eloPenalty === 0) {
    return NextResponse.json({ message: "Nothing to do." });
  }

  try {
    if (eraseAttempt) {
      await adminFirestore.collection("gameSubmissions").doc(submissionId).delete();
    }

    if (eloPenalty > 0 || eraseAttempt) {
      const userRef = adminFirestore.collection("users").doc(userId);
      const userSnap = await userRef.get();
      const currentElo: number = userSnap.data()?.bElo ?? 500;
      const newElo = Math.max(0, currentElo - eloPenalty);

      const update: Record<string, any> = { bElo: newElo };
      if (eraseAttempt) update.contestsPlayed = FieldValue.increment(-1);

      await userRef.update(update);
      return NextResponse.json({ message: "Done.", newElo });
    }

    return NextResponse.json({ message: "Done." });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed." }, { status: 500 });
  }
}
