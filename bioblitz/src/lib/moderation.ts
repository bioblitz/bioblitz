//admin are able to view reported messages and resolve them, similar to how it is for reported questions.
//they can also soft delete messages

import {
  collection,
  doc,
  query,
  orderBy,
  where,
  limit,
  updateDoc,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { firestore as db } from "@/lib/firebase";

export type ReportStatus = "pending" | "resolved";
export type ReportReason = "harassment" | "spam" | "inappropriate" | "other";

export interface MessageReport {
  id: string;
  conversationId: string;
  messageId: string;
  messageText: string;
  senderUid: string;
  reportedByUid: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  createdAt: number;
  resolvedAt?: number;
  resolvedByUid?: string;
  resolution?: "dismissed" | "deleted_message";
}

export function subscribeToReports(
  status: ReportStatus | "all",
  onUpdate: (reports: MessageReport[]) => void,
): Unsubscribe {
  const q =
    status === "all"
      ? query(
          collection(db, "messageReports"),
          orderBy("createdAt", "desc"),
          limit(200),
        )
      : query(
          collection(db, "messageReports"),
          where("status", "==", status),
          orderBy("createdAt", "desc"),
          limit(200),
        );

  return onSnapshot(q, (snap) => {
    const reports: MessageReport[] = snap.docs.map((d) => {
      const data = d.data();
      const createdAt =
        data.createdAt instanceof Timestamp
          ? data.createdAt.toMillis()
          : Date.now();
      const resolvedAt =
        data.resolvedAt instanceof Timestamp
          ? data.resolvedAt.toMillis()
          : undefined;
      return {
        id: d.id,
        conversationId: data.conversationId,
        messageId: data.messageId,
        messageText: data.messageText,
        senderUid: data.senderUid,
        reportedByUid: data.reportedByUid,
        reason: data.reason,
        details: data.details || "",
        status: data.status,
        createdAt,
        resolvedAt,
        resolvedByUid: data.resolvedByUid,
        resolution: data.resolution,
      };
    });
    onUpdate(reports);
  });
}

export async function dismissReport(
  reportId: string,
  staffUid: string,
): Promise<void> {
  await updateDoc(doc(db, "messageReports", reportId), {
    status: "resolved",
    resolution: "dismissed",
    resolvedAt: serverTimestamp(),
    resolvedByUid: staffUid,
  });
}

export async function deleteReportedMessage(input: {
  reportId: string;
  conversationId: string;
  messageId: string;
  staffUid: string;
}): Promise<void> {
  await updateDoc(
    doc(db, "conversations", input.conversationId, "messages", input.messageId),
    {
      deletedAt: serverTimestamp(),
      deletedBy: input.staffUid,
    },
  );

  await updateDoc(doc(db, "messageReports", input.reportId), {
    status: "resolved",
    resolution: "deleted_message",
    resolvedAt: serverTimestamp(),
    resolvedByUid: input.staffUid,
  });
}
