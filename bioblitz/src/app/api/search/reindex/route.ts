import { NextResponse } from "next/server";
import admin, { adminAuth, adminFirestore } from "@/lib/firebase-admin";

function normalize(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenize(inputs: Array<string | undefined | null>): string[] {
  const tokens = new Set<string>();
  inputs.forEach((value) => {
    if (!value) return;
    normalize(String(value))
      .split(" ")
      .filter((token) => token.length > 1)
      .forEach((token) => tokens.add(token));
  });
  return Array.from(tokens);
}

function normalizeRoles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((role) => String(role).toLowerCase().trim())
    .filter(Boolean);
}

function isAdminFromClaims(claims: any): boolean {
  const roles = normalizeRoles(claims?.roles);
  return claims?.admin === true || claims?.role === "admin" || roles.includes("admin");
}

async function requireAdmin(request: Request): Promise<void> {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    throw new Error("Unauthorized");
  }

  const decoded = await adminAuth.verifyIdToken(token);
  let adminAccess = isAdminFromClaims(decoded);
  if (!adminAccess) {
    const userDoc = await adminFirestore.collection("users").doc(decoded.uid).get();
    const roles = normalizeRoles(userDoc.data()?.roles);
    adminAccess = roles.includes("admin");
  }

  if (!adminAccess) {
    throw new Error("Forbidden");
  }
}

async function commitBatch(batch: FirebaseFirestore.WriteBatch, count: number) {
  if (count > 0) {
    await batch.commit();
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
  } catch (err: any) {
    const status = err?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ error: err?.message || "Unauthorized" }, { status });
  }

  let batch = adminFirestore.batch();
  let batchCount = 0;

  const writeDoc = async (docId: string, data: Record<string, any>) => {
    const ref = adminFirestore.collection("search_index").doc(docId);
    batch.set(ref, data, { merge: true });
    batchCount += 1;
    if (batchCount >= 450) {
      await commitBatch(batch, batchCount);
      batch = adminFirestore.batch();
      batchCount = 0;
    }
  };

  const usersSnap = await adminFirestore.collection("users").get();
  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data() as any;
    const username = String(data.username || "").trim();
    const displayName = String(data.displayName || "").trim();
    const channelName = String(data.channelName || "").trim();

    const title = displayName || username || "User";
    const subtitle = username ? `@${username}` : "";

    await writeDoc(`user_${docSnap.id}`, {
      type: "user",
      refId: docSnap.id,
      title,
      subtitle,
      href: `/profile/${username || docSnap.id}`,
      keywords: tokenize([title, subtitle, username, displayName]),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (channelName || username) {
      const channelTitle = channelName || `${title} Channel`;
      const channelSubtitle = username ? `@${username}` : "Channel";
      await writeDoc(`channel_${docSnap.id}`, {
        type: "channel",
        refId: docSnap.id,
        title: channelTitle,
        subtitle: channelSubtitle,
        href: `/channel/${username || docSnap.id}`,
        keywords: tokenize([channelTitle, channelSubtitle, username]),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  const setsSnap = await adminFirestore.collection("sets").get();
  for (const docSnap of setsSnap.docs) {
    const data = docSnap.data() as any;
    if (data.hidden === true) continue;
    if (data.status && data.status !== "completed") continue;

    const title = String(data.title || "Untitled Blitz").trim();
    const subtitle = String(data.topic || "").trim();
    const creatorUsername = String(data.creatorUsername || "").trim();

    await writeDoc(`contest_${docSnap.id}`, {
      type: "contest",
      refId: docSnap.id,
      title,
      subtitle,
      href: `/contests/${docSnap.id}`,
      keywords: tokenize([title, subtitle, creatorUsername]),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  const potdSnap = await adminFirestore.collection("potd").get();
  for (const docSnap of potdSnap.docs) {
    const data = docSnap.data() as any;
    const title = String(data.title || "Daily Problem").trim();
    const subtitle = String(data.topic || "").trim();
    const date = data.date?.toDate?.() ? data.date.toDate().toISOString() : String(data.date || "");

    await writeDoc(`potd_${docSnap.id}`, {
      type: "potd",
      refId: docSnap.id,
      title,
      subtitle,
      href: `/potd/${docSnap.id}`,
      keywords: tokenize([title, subtitle, date]),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await commitBatch(batch, batchCount);

  return NextResponse.json({ message: "Reindex complete" });
}
