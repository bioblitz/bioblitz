import { doc, writeBatch, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";

const db = getFirestore(app);

/**
 * Mutually remove the friendship between two users.
 * Deletes both friend docs in a single batch.
 */
export async function removeFriendship(
  uidA: string,
  uidB: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", uidA, "friends", uidB));
  batch.delete(doc(db, "users", uidB, "friends", uidA));
  await batch.commit();
}
