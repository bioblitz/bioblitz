import { NextResponse } from "next/server";
import { sendNotificationEmail } from "@/lib/emailService";
import { adminFirestore } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  // Debugging logs
  console.log("🔥 1. API Route hit!");

  try {
    const { recipientUid, type, data } = await request.json();
    console.log("📦 2. Received data:", { recipientUid, type });

    if (!recipientUid) {
      console.log("❌ No Recipient ID");
      return NextResponse.json({ error: "No ID" }, { status: 400 });
    }

    // 1. Fetch User Data from Firestore
    const userDoc = await adminFirestore
      .collection("users")
      .doc(recipientUid)
      .get();

    if (!userDoc.exists) {
      console.log("❌ User not found in DB");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const email = userData?.email;
    const lastActive = userData?.lastActive?.toDate(); // Get lastActive timestamp

    const emailEnabled = userData?.emailNotifications ?? true;

    console.log("👤 3. User Data:", { email, emailEnabled });

    console.log("👤 3. Found User Email:", email);

    if (emailEnabled === false) {
      return NextResponse.json({
        success: true,
        message: "Skipped (User disabled email notifications)",
      });
    }

    if (!email) {
      return NextResponse.json({ error: "User has no email" }, { status: 400 });
    }

    // 2. Logic: Check 24-Hour Activity
    let shouldSendEmail = true;

    if (lastActive) {
      const now = new Date();
      // Calculate difference in hours
      const hoursSinceActive =
        (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60);

      // 👇 RESTORED LOGIC: If active within last 24 hours, SKIP email
      if (hoursSinceActive < 24) {
        shouldSendEmail = false;
        console.log(
          `⏳ User active ${hoursSinceActive.toFixed(1)}h ago. Email skipped.`
        );
      }
    }
    // Note: If lastActive is undefined (new user or never logged in), shouldSendEmail remains true.

    // 3. Send or Skip
    if (shouldSendEmail) {
      console.log(
        "🚀 4. Attempting to send email via Zoho... (Inactive > 24h or New User)"
      );

      const emailResult = await sendNotificationEmail({
        to: email,
        type: type,
        data: data,
      });

      console.log("✅ 5. Email Service Result:", emailResult);

      return NextResponse.json({ success: true, message: "Email sent" });
    } else {
      return NextResponse.json({
        success: true,
        message: "Skipped (User recently active)",
      });
    }
  } catch (error) {
    console.error("💥 CRASH REPORT:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
