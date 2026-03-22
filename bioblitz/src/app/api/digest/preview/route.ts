import { adminAuth } from "@/lib/firebase-admin";
import { buildDigestForUser, buildDigestHtml } from "@/lib/weeklyDigest";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!token) {
    return new Response("No token provided", {
      status: 401,
      headers: { "Content-Type": "text/plain" },
    });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const data = await buildDigestForUser(decoded.uid);

    if (!data) {
      return new Response(
        "No digest data — no activity this week or no email on account.",
        {
          status: 404,
          headers: { "Content-Type": "text/plain" },
        },
      );
    }

    const html = buildDigestHtml(data);
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("Digest preview error:", err);
    return new Response(`Error: ${err?.message || String(err)}`, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
