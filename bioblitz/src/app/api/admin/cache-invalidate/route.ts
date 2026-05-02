import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";

/**
 * POST /api/admin/cache-invalidate
 * 
 * Invalidates admin stats cache. Can be called:
 * - By admins manually via admin page
 * - By server-side functions when users sign up
 * - By server-side functions when game submissions are created
 * 
 * This endpoint invalidates the "admin-stats" cache tag, forcing a fresh fetch
 * on the next admin stats request.
 */
export async function POST(request: Request) {
  try {
    // Verify admin auth
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Check if user is admin
    let isAdmin = false;
    const userDoc = await adminFirestore.collection("users").doc(uid).get();
    const data = userDoc.data() as any;
    if (data?.roles && Array.isArray(data.roles)) {
      isAdmin = data.roles.map((r: unknown) => String(r).toLowerCase()).includes("admin");
    }

    if (!isAdmin && decoded.admin !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Invalidate the cache
    revalidateTag("admin-stats");

    return NextResponse.json({ success: true, message: "Admin stats cache invalidated" });
  } catch (error: any) {
    console.error("Cache invalidation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to invalidate cache" },
      { status: 500 }
    );
  }
}
