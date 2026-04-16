import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { DecodedIdToken } from "firebase-admin/auth";

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => String(r).toLowerCase().trim())
    .filter(Boolean);
}

function hasStaffAccess(claims: DecodedIdToken, userDocRoles: string[]): boolean {
  const claimRoles = normalizeRoles(claims?.roles);
  const isAdminClaim = claims?.admin === true || claims?.role === "admin" || claimRoles.includes("admin");
  const isStaffClaim = claims?.role === "staff" || claimRoles.includes("staff");

  if (isAdminClaim || isStaffClaim) return true;
  return userDocRoles.includes("admin") || userDocRoles.includes("staff");
}

async function requireStaff(request: Request): Promise<void> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) throw new Error("Unauthorized");

  const decoded = await adminAuth.verifyIdToken(token);
  const userDoc = await adminFirestore.collection("users").doc(decoded.uid).get();
  const userRoles = normalizeRoles(userDoc.data()?.roles);

  if (!hasStaffAccess(decoded, userRoles)) {
    throw new Error("Forbidden");
  }
}

export async function GET(request: Request) {
  try {
    await requireStaff(request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const aprilStart = new Date(Date.UTC(year, 3, 1, 0, 0, 0, 0));
  const aprilEnd = new Date(Date.UTC(year, 3, 30, 23, 59, 59, 999));
  const target = 100;

  let publishedCount = 0;

  try {
    const countSnap = await adminFirestore
      .collection("sets")
      .where("status", "==", "completed")
      .where("creation", ">=", Timestamp.fromDate(aprilStart))
      .where("creation", "<=", Timestamp.fromDate(aprilEnd))
      .count()
      .get();

    publishedCount = countSnap.data().count || 0;
  } catch {
    publishedCount = 0;
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil((aprilEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return NextResponse.json({
    quota: {
      target,
      published: publishedCount,
      remaining: Math.max(target - publishedCount, 0),
      progress: target > 0 ? Math.min(1, publishedCount / target) : 0,
      monthLabel: `April ${year}`,
      daysRemaining,
    },
  });
}
