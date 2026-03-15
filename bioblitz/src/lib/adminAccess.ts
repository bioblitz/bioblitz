import "server-only";

import { adminAuth, adminFirestore } from "@/lib/firebase-admin";

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((role) => String(role).toLowerCase().trim())
    .filter(Boolean);
}

function isStaffOrAdminFromClaims(claims: any): boolean {
  const roles = normalizeRoles(claims?.roles);
  return (
    claims?.admin === true ||
    claims?.role === "admin" ||
    roles.includes("admin") ||
    roles.includes("staff")
  );
}

export async function requireStaffOrAdmin(
  request: Request,
): Promise<{ uid: string }>
{
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  let allowed = isStaffOrAdminFromClaims(decoded);
  if (!allowed) {
    const userDoc = await adminFirestore.collection("users").doc(uid).get();
    const roles = normalizeRoles(userDoc.data()?.roles);
    allowed = roles.includes("admin") || roles.includes("staff");
  }

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return { uid };
}
