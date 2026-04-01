import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { gatherNewsletterData } from "@/lib/newsletter/weekly-newsletter-data";
import { generateNewsletterPageHtml } from "@/lib/newsletter/weekly-newsletter-page";
import { generateNewsletterNotificationEmail } from "@/lib/newsletter/weekly-newsletter-email";
// all you need to go to view your newsletter (or anyone's really) is their uid and the issue number, only admin can do this though so it's not a security risk

// GET /api/weekly-newsletter/preview?uid=xxx&issue=14&blitzOfWeek=abc&studyTipTitle=...&studyTipBody=...&mode=email|page
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const expectedToken = process.env.DIGEST_PREVIEW_TOKEN || "";

  if (process.env.NODE_ENV === "development") {
    // skip auth check
  } else {
    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid") || "";
  const issue = parseInt(searchParams.get("issue") || "1");
  const blitzOfWeekId = searchParams.get("blitzOfWeek") || undefined;
  const studyTipTitle = searchParams.get("studyTipTitle") || undefined;
  const studyTipBody = searchParams.get("studyTipBody") || undefined;
  const mode = searchParams.get("mode") || "page"; // "page" | "email"

  if (!uid) {
    return NextResponse.json({ error: "uid required" }, { status: 400 });
  }

  const data = await gatherNewsletterData(
    uid,
    issue,
    blitzOfWeekId,
    studyTipTitle,
    studyTipBody,
  );

  if (!data) {
    return NextResponse.json(
      { error: "No data for this user" },
      { status: 404 },
    );
  }

  if (mode === "email") {
    const html = generateNewsletterNotificationEmail(data.username, issue, uid);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const html = generateNewsletterPageHtml(data);
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// POST /api/weekly-newsletter/preview — save issue config to Firestore
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const expectedToken = process.env.DIGEST_PREVIEW_TOKEN || "";

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { issue, blitzOfWeekId, studyTipTitle, studyTipBody } = body;

  if (!issue) {
    return NextResponse.json({ error: "issue required" }, { status: 400 });
  }

  const configData: Record<string, any> = {};
  if (blitzOfWeekId) configData.blitzOfWeekId = blitzOfWeekId;
  if (studyTipTitle) configData.studyTipTitle = studyTipTitle;
  if (studyTipBody) configData.studyTipBody = studyTipBody;
  await adminFirestore
    .collection("newsletterConfig")
    .doc(`issue-${issue}`)
    .set(configData, { merge: true });

  return NextResponse.json({ message: `Issue ${issue} config saved.` });
}
