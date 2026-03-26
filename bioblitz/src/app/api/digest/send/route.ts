import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminFirestore } from "@/lib/firebase-admin";
import { gatherWeeklyDigest } from "@/lib/digest-data";
import { generateDigestHtml } from "@/lib/digest-email";
import { sendMail } from "@/lib/mailer";

const CRON_SECRET = process.env.CRON_SECRET || "";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  const authorized = await checkAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const testUid = url.searchParams.get("testUid");
  const dryRun = url.searchParams.get("dryRun") === "true";
  const batchSize = Math.min(
    parseInt(url.searchParams.get("batchSize") || "3", 10) || 3,
    10,
  );
  const delayMs = Math.max(
    parseInt(url.searchParams.get("delayMs") || "1500", 10) || 1500,
    500,
  );

  const log: string[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    let userIds: string[];

    if (testUid) {
      userIds = [testUid];
      log.push(`Test mode: sending only to ${testUid}`);
    } else {
      const usersSnap = await adminFirestore
        .collection("users")
        .where("emailNotifications", "!=", false)
        .get();

      userIds = usersSnap.docs
        .filter((d) => {
          const data = d.data();
          return data.email && typeof data.email === "string";
        })
        .map((d) => d.id);

      log.push(`Found ${userIds.length} opted-in users with emails`);
    }

    if (dryRun) {
      log.push("Dry run — no emails will be sent");
    }

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((uid) => processUser(uid, dryRun)),
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        const uid = batch[j];

        if (result.status === "fulfilled") {
          if (result.value === "sent") {
            sent++;
          } else if (result.value === "dry-run") {
            sent++;
            log.push(`[dry-run] Would send to ${uid}`);
          } else {
            skipped++;
            log.push(`Skipped ${uid}: ${result.value}`);
          }
        } else {
          failed++;
          log.push(`Failed ${uid}: ${result.reason?.message || result.reason}`);
        }
      }

      if (i + batchSize < userIds.length) {
        await sleep(delayMs);
      }
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      failed,
      total: userIds.length,
      elapsed: `${elapsed}s`,
      dryRun,
      log: log.slice(0, 100),
    });
  } catch (error: any) {
    console.error("[digest/send] Fatal error:", error);
    return NextResponse.json(
      {
        error: error?.message || "Internal server error",
        sent,
        skipped,
        failed,
        log: log.slice(0, 50),
      },
      { status: 500 },
    );
  }
}

async function processUser(
  uid: string,
  dryRun: boolean,
): Promise<"sent" | "dry-run" | string> {
  const data = await gatherWeeklyDigest(uid);

  if (!data) return "no user or no email";
  if (!data.email) return "no email";

  const html = generateDigestHtml(data);
  const subject = buildSubject(data);

  if (dryRun) return "dry-run";

  await sendMail({
    to: data.email,
    subject,
    html,
  });

  return "sent";
}

function buildSubject(data: {
  currentElo: number;
  eloChange: number;
  blitzesThisWeek: number;
  currentStreak: number;
}): string {
  if (data.blitzesThisWeek === 0) {
    return data.currentStreak > 0
      ? `Your ${data.currentStreak}-day streak is at risk`
      : "Your weekly BioBlitz recap is here";
  }

  if (data.eloChange > 0) {
    return `You climbed +${data.eloChange} Elo this week`;
  }

  if (data.currentStreak >= 7) {
    return `${data.currentStreak} days strong — your BioBlitz week`;
  }

  return `Your week on BioBlitz: ${data.blitzesThisWeek} blitz${data.blitzesThisWeek !== 1 ? "es" : ""}, ${data.currentElo} Elo`;
}

async function checkAuth(req: NextRequest): Promise<boolean> {
  const cronHeader = req.headers.get("x-cron-secret");
  if (CRON_SECRET && cronHeader === CRON_SECRET) {
    return true;
  }

  const authHeader = req.headers.get("Authorization");
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) {
    return true;
  }

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.split("Bearer ")[1];
      const decoded = await adminAuth.verifyIdToken(token);
      const claims = decoded as any;
      const roles = Array.isArray(claims.roles)
        ? claims.roles.map((r: any) => String(r).toLowerCase())
        : [];
      return (
        claims.admin === true ||
        claims.role === "admin" ||
        roles.includes("admin")
      );
    } catch {
      return false;
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
