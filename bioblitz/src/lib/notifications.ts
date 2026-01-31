import {
  addDoc,
  collection,
  serverTimestamp,
  getFirestore,
} from "firebase/firestore";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

export type NotificationType = "friend_request" | "friend_accept" | "system";

export interface AppNotification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  senderUid?: string;
  senderPhotoURL?: string;
  read: boolean;
  createdAt: any;
}

export const createNotification = async (
  recipientUid: string,
  type: NotificationType,
  title: string,
  message: string,
  link: string,
  senderUid?: string,
  senderPhotoURL?: string,
  senderName?: string
) => {
  try {
    await addDoc(collection(db, "notifications"), {
      recipientUid,
      type,
      title,
      message,
      link,
      senderUid: senderUid || null,
      senderPhotoURL: senderPhotoURL || null,
      read: false,
      createdAt: serverTimestamp(),
    });

    if (type === "friend_request") {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUid,
          type,
          data: {
            senderName: senderName || "A user",
            senderPhotoURL: senderPhotoURL,
            link: link,
          },
        }),
      });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};
