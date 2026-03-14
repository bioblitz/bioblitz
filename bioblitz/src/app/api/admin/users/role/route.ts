import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => String(r).toLowerCase().trim())
    .filter(Boolean);
}

function isAdminFromClaims(claims: any): boolean {
  const roles = normalizeRoles(claims?.roles);
  return claims?.admin === true || claims?.role === "admin" || roles.includes("admin");
}

async function requireAdmin(request: Request): Promise<{ uid: string }> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  const uid = decoded.uid;

  let admin = isAdminFromClaims(decoded);
  if (!admin) {
    const userDoc = await adminFirestore.collection("users").doc(uid).get();
    const roles = normalizeRoles(userDoc.data()?.roles);
    admin = roles.includes("admin");
  }

  if (!admin) {
    throw new Error("Forbidden");
  }

  return { uid };
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const uid = String(body?.uid || "").trim();
  const role = String(body?.role || "").trim().toLowerCase();
  const rolesInput = body?.roles;

  if (!uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }

  let roles: string[] = [];
  if (Array.isArray(rolesInput)) {
    roles = normalizeRoles(rolesInput);
  } else if (role === "admin" || role === "staff") {
    roles = [role];
  }

  await adminFirestore.collection("users").doc(uid).set({ roles }, { merge: true });

  try {
    const userRecord = await adminAuth.getUser(uid);
    const existingClaims = userRecord.customClaims ?? {};
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      admin: roles.includes("admin"),
      roles,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update user claims." }, { status: 500 });
  }

  return NextResponse.json({ message: "Role updated." });
}
