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

  if (!submissionId || !userId) {
    return NextResponse.json({ error: "Missing submissionId or userId" }, { status: 400 });
  }

  try {
    await adminFirestore.collection("gameSubmissions").doc(submissionId).delete();

    const userRef = adminFirestore.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const currentElo: number = userSnap.data()?.bElo ?? 500;
    const newElo = Math.max(0, currentElo - 100);

    await userRef.update({
      bElo: newElo,
      contestsPlayed: FieldValue.increment(-1),
    });

    return NextResponse.json({ message: "Submission erased and ELO adjusted.", newElo });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to erase submission." }, { status: 500 });
  }
}
