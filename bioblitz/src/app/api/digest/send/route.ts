import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { generateNewsletterNotificationEmail } from "@/lib/newsletter/weekly-newsletter-email";

// ─────────────────────────────────────────────────────────────────────────────
// SAFETY GUARD — set to false only when you're ready to send to everyone
// While true, emails only go to ALLOWED_TEST_UIDS
// ─────────────────────────────────────────────────────────────────────────────
const TEST_MODE = true;
const ALLOWED_TEST_UIDS = [
  "jCiJOnMGpMZEggNJTN9RR5QhmLN2", // your uid
];

const ZEPTO_API_KEY = process.env.ZEPTO_MAIL_API_KEY || "";
const FROM_ADDRESS =
  process.env.ZEPTO_FROM_ADDRESS || "newsletter@bioblitz.net";
const FROM_NAME = "BioBlitz";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://bioblitz.net";

interface SendResult {
  uid: string;
  email: string;
  status: "sent" | "skipped" | "error";
  error?: string;
}

async function sendEmail(
  to: string,
  toName: string,
  subject: string,
  html: string,
): Promise<void> {
  const res = await fetch("https://api.zeptomail.com/v1.1/email", {
    method: "POST",
    headers: {
      Authorization: ZEPTO_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: { address: FROM_ADDRESS, name: FROM_NAME },
      to: [{ email_address: { address: to, name: toName } }],
      subject,
      htmlbody: html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ZeptoMail error ${res.status}: ${body}`);
  }
}

// POST /api/weekly-newsletter/send
// Body: { issue: number }
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const expectedToken = process.env.DIGEST_PREVIEW_TOKEN || "";

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const issue: number = body.issue;

  if (!issue) {
    return NextResponse.json({ error: "issue required" }, { status: 400 });
  }

  if (!ZEPTO_API_KEY) {
    return NextResponse.json(
      { error: "ZEPTO_MAIL_API_KEY not set" },
      { status: 500 },
    );
  }

  // Fetch all users who have email notifications enabled
  const usersSnap = await adminFirestore
    .collection("users")
    .where("emailNotifications", "!=", false)
    .get();

  const results: SendResult[] = [];
  let sentCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const doc of usersSnap.docs) {
    const u = doc.data();
    const uid = doc.id;
    const email: string = u.email || "";
    const username: string = u.username || "there";

    if (!email) {
      results.push({ uid, email: "", status: "skipped" });
      skippedCount++;
      continue;
    }

    // ── SAFETY GUARD ────────────────────────────────────────────────────────
    if (TEST_MODE && !ALLOWED_TEST_UIDS.includes(uid)) {
      skippedCount++;
      continue;
    }
    // ────────────────────────────────────────────────────────────────────────

    try {
      const html = generateNewsletterNotificationEmail(username, issue, uid);
      const subject = `BioBlitz Weekly Digest · Issue #${issue} is here`;

      await sendEmail(email, username, subject, html);

      results.push({ uid, email, status: "sent" });
      sentCount++;

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 100));
    } catch (e: any) {
      results.push({ uid, email, status: "error", error: e.message });
      errorCount++;
      console.error(`newsletter send error for ${uid}:`, e);
    }
  }

  return NextResponse.json({
    testMode: TEST_MODE,
    issue,
    sent: sentCount,
    skipped: skippedCount,
    errors: errorCount,
    results: TEST_MODE ? results : undefined, // only return full results in test mode
  });
}
