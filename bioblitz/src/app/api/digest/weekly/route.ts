import { NextResponse } from "next/server";
import { adminFirestore } from "@/lib/firebase-admin";
import { sendWeeklyDigest } from "@/lib/weeklyDigest";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const usersSnap = await adminFirestore.collection("users").get();

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    const userDocs = usersSnap.docs;
    for (let i = 0; i < userDocs.length; i += 5) {
      const chunk = userDocs.slice(i, i + 5);

      const results = await Promise.allSettled(
        chunk.map(async (userDoc) => {
          const uid = userDoc.id;
          const result = await sendWeeklyDigest(uid);

          if (result.success) {
            sent++;
          } else if (result.skipped) {
            skipped++;
          } else {
            failed++;
          }

          return result;
        }),
      );

      if (i + 5 < userDocs.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      message: "Weekly digest complete",
      sent,
      skipped,
      failed,
      totalUsers: userDocs.length,
    });
  } catch (err: any) {
    console.error("Weekly digest error:", err);
    return NextResponse.json(
      { error: "Failed to send weekly digest" },
      { status: 500 },
    );
  }
}
