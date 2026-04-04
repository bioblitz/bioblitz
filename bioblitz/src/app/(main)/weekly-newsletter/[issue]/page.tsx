import { adminFirestore, adminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { gatherNewsletterData } from "@/lib/newsletter/weekly-newsletter-data";
import { generateNewsletterPageHtml } from "@/lib/newsletter/weekly-newsletter-page";

interface Props {
  params: Promise<{ issue: string }>;
  searchParams: Promise<{ uid?: string; token?: string }>;
}

export default async function WeeklyNewsletterPage({
  params,
  searchParams,
}: Props) {
  const { issue } = await params;
  const { uid: queryUid } = await searchParams;

  const issueNumber = parseInt(issue) || 1;

  console.log("newsletter page:", { queryUid, issueNumber });

  let uid: string | null = null;

  if (queryUid) {
    uid = queryUid;
  } else {
    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session")?.value;
      if (sessionCookie) {
        const decoded = await adminAuth.verifySessionCookie(
          sessionCookie,
          true,
        );
        uid = decoded.uid;
      }
    } catch (_) {}
  }

  if (!uid) redirect("/auth");

  try {
    const snapshotSnap = await adminFirestore
      .collection("newsletterSnapshots")
      .doc(`issue-${issueNumber}`)
      .collection("users")
      .doc(uid)
      .get();

    if (snapshotSnap.exists) {
      const html = snapshotSnap.data()?.html as string;
      if (html) {
        return (
          <iframe
            srcDoc={html}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              border: "none",
              zIndex: 9999,
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation"
          />
        );
      }
    }
  } catch (_) {}

  let blitzOfWeekId: string | undefined;
  let studyTipTitle: string | undefined;
  let studyTipBody: string | undefined;

  try {
    const configSnap = await adminFirestore
      .collection("newsletterConfig")
      .doc(`issue-${issueNumber}`)
      .get();

    if (configSnap.exists) {
      const cfg = configSnap.data()!;
      blitzOfWeekId = cfg.blitzOfWeekId;
      studyTipTitle = cfg.studyTipTitle;
      studyTipBody = cfg.studyTipBody;
    }
  } catch (_) {}

  const data = await gatherNewsletterData(
    uid,
    issueNumber,
    blitzOfWeekId,
    studyTipTitle,
    studyTipBody,
  );

  if (!data) {
    return (
      <div
        style={{
          background: "#09090b",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <p style={{ color: "#555", fontFamily: "monospace" }}>
          Newsletter not available.
        </p>
        <p style={{ color: "#333", fontFamily: "monospace", fontSize: "12px" }}>
          uid used: {uid}
        </p>
        <p style={{ color: "#333", fontFamily: "monospace", fontSize: "12px" }}>
          queryUid: {queryUid || "none"}
        </p>
      </div>
    );
  }

  const html = generateNewsletterPageHtml(data);

  return (
    <iframe
      srcDoc={html}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        border: "none",
        zIndex: 9999,
      }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation"
    />
  );
}

export function generateStaticParams() {
  return Array.from({ length: 50 }, (_, i) => ({ issue: String(i + 1) }));
}
