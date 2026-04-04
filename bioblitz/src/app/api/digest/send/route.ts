import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { gatherNewsletterData } from "@/lib/newsletter/weekly-newsletter-data";
import { generateNewsletterPageHtml } from "@/lib/newsletter/weekly-newsletter-page";
import { generateNewsletterNotificationEmail } from "@/lib/newsletter/weekly-newsletter-email";
import nodemailer from "nodemailer";

const TEST_MODE = true;
const ALLOWED_TEST_UIDS = [
  "jCiJOnMGpMZEggNJTN9RR5QhmLN2", // dipishasubedi@gmail.com
  "61B9a6VKyGSGqinMvxPI1L2L5Y23", // aarnavsuwal@gmail.com
  "RP8SEvXvxyYrLZYv2a40kLunmyD3", // elifeldman769@gmail.com
  "VsiffsXavFRKs1HBFdLHMlzb3rX2", // elijah.feldman.sunshine.123@gmail.com
  "KjmC2i3d3GUPpDQ4uSXVRNrml7z1", // dipishasubedi340@gmail.com
];
const BATCH_SIZE = 50;

const FROM_ADDRESS = process.env.SMTP_FROM_ADDRESS || "newsletter@bioblitz.net";
const FROM_NAME = "BioBlitz";

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
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.zeptomail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  });
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
    to: `"${toName}" <${to}>`,
    subject,
    html,
  });
}

export async function POST(request: Request) {
  console.log("digest/send POST hit");

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  const expectedToken = process.env.DIGEST_PREVIEW_TOKEN || "";

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const issue: number = body.issue;
  const startAfterUid: string | undefined = body.startAfter;

  if (!issue) {
    return NextResponse.json({ error: "issue required" }, { status: 400 });
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json(
      { error: "SMTP credentials not set" },
      { status: 500 },
    );
  }

  console.log("SMTP debug:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    passLength: process.env.SMTP_PASS?.length,
  });

  let blitzOfWeekId: string | undefined;
  let studyTipTitle: string | undefined;
  let studyTipBody: string | undefined;

  try {
    const configSnap = await adminFirestore
      .collection("newsletterConfig")
      .doc(`issue-${issue}`)
      .get();
    if (configSnap.exists) {
      const cfg = configSnap.data()!;
      blitzOfWeekId = cfg.blitzOfWeekId;
      studyTipTitle = cfg.studyTipTitle;
      studyTipBody = cfg.studyTipBody;
    }
  } catch (e) {
    console.error("newsletter: config load error", e);
  }

  let usersQuery = adminFirestore
    .collection("users")
    .where("emailNotifications", "!=", false)
    .orderBy("emailNotifications")
    .orderBy("__name__")
    .limit(BATCH_SIZE);

  if (startAfterUid) {
    const startAfterDoc = await adminFirestore
      .collection("users")
      .doc(startAfterUid)
      .get();
    if (startAfterDoc.exists) {
      usersQuery = usersQuery.startAfter(startAfterDoc);
    }
  }

  const usersSnap = await usersQuery.get();

  const results: SendResult[] = [];
  let sentCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let lastUid: string | null = null;

  for (const doc of usersSnap.docs) {
    const u = doc.data();
    const uid = doc.id;
    lastUid = uid;
    const email: string = u.email || "";
    const username: string = u.username || "there";

    if (!email) {
      skippedCount++;
      continue;
    }

    if (TEST_MODE && !ALLOWED_TEST_UIDS.includes(uid)) {
      skippedCount++;
      continue;
    }

    if (u.marketingConsent === false) {
      skippedCount++;
      continue;
    }

    try {
      const data = await gatherNewsletterData(
        uid,
        issue,
        blitzOfWeekId,
        studyTipTitle,
        studyTipBody,
      );

      if (data) {
        const pageHtml = generateNewsletterPageHtml(data);
        await adminFirestore
          .collection("newsletterSnapshots")
          .doc(`issue-${issue}`)
          .collection("users")
          .doc(uid)
          .set({ html: pageHtml, savedAt: new Date() });
      }

      const notificationHtml = generateNewsletterNotificationEmail(
        username,
        issue,
        uid,
      );
      const subject = `Your BioBlitz Weekly Digest · Issue #${issue} is here`;

      await sendEmail(email, username, subject, notificationHtml);

      results.push({ uid, email, status: "sent" });
      sentCount++;

      await new Promise((r) => setTimeout(r, 150));
    } catch (e: any) {
      results.push({ uid, email, status: "error", error: e.message });
      errorCount++;
      console.error(`newsletter send error for ${uid}:`, e);
    }
  }

  const hasMore = usersSnap.docs.length === BATCH_SIZE;

  return NextResponse.json({
    testMode: TEST_MODE,
    issue,
    sent: sentCount,
    skipped: skippedCount,
    errors: errorCount,
    hasMore,
    netxtStartAfter: hasMore ? lastUid : null,
    results: TEST_MODE ? results : undefined,
  });
}
