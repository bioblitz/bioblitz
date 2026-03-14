import { NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { applyUsernamePolicy } from "@/lib/usernamePolicy";
import { applyTextPolicy } from "@/lib/textPolicy";

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

function formatCreatedAt(value: any): string | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const usersSnap = await adminFirestore.collection("users").get();
  const users = usersSnap.docs.map((docSnap) => {
    const data = docSnap.data() as any;
    return {
      uid: docSnap.id,
      displayName: data.displayName || "",
      username: data.username || "",
      email: data.email || "",
      roles: normalizeRoles(data.roles),
      createdAt: formatCreatedAt(data.createdAt),
    };
  });

  return NextResponse.json({ users });
}

export async function DELETE(request: Request) {
  let actingUid = "";
  try {
    const admin = await requireAdmin(request);
    actingUid = admin.uid;
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const uid = String(body?.uid || "").trim();

  if (!uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }

  if (uid === actingUid) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  try {
    await adminAuth.deleteUser(uid);
  } catch (err: any) {
    if (err?.code !== "auth/user-not-found") {
      return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
    }
  }

  await adminFirestore.collection("users").doc(uid).delete();
  return NextResponse.json({ message: "User deleted." });
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  const body = await request.json();
  const uid = String(body?.uid || "").trim();
  const displayNameRaw = String(body?.displayName || "").trim();
  const rawUsername = String(body?.username || "").trim();
    const { value: displayName } = await applyTextPolicy(displayNameRaw);
  const { value: censoredUsername, censored } = await applyUsernamePolicy(rawUsername);
  if (censored) {
    return NextResponse.json(
      { error: "Inappropriate username, try again." },
      { status: 400 }
    );
  }
  const username = censoredUsername || "";

  if (!uid) {
    return NextResponse.json({ error: "Missing uid" }, { status: 400 });
  }

  if (username) {
    const existing = await adminFirestore
      .collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();

    if (!existing.empty && existing.docs[0].id !== uid) {
      return NextResponse.json({ error: "Username already in use." }, { status: 409 });
    }
  }

  await adminFirestore
    .collection("users")
    .doc(uid)
    .set(
      {
        displayName,
        username: username || null,
      },
      { merge: true }
    );

  return NextResponse.json({ message: "User updated." });
}
