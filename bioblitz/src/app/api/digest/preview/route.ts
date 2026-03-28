import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { gatherWeeklyDigest } from "@/lib/digest-data";
import { generateDigestHtml } from "@/lib/digest-email";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new NextResponse("Missing or malformed Authorization header", {
        status: 401,
      });
    }

    const token = authHeader.split("Bearer ")[1];

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return new NextResponse("Invalid or expired token", { status: 401 });
    }

    const data = await gatherWeeklyDigest(uid);
    if (!data) {
      return new NextResponse("User not found or has no email", {
        status: 404,
      });
    }

    const html = generateDigestHtml(data);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("[digest/preview] Error:", error);
    return new NextResponse(error?.message || "Internal server error", {
      status: 500,
    });
  }
}
