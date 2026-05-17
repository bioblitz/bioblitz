import { doc, getDoc, writeBatch, getFirestore } from "firebase/firestore";
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

export async function areMutualFriends(
  uidA: string,
  uidB: string,
): Promise<boolean> {
  try {
    const [snapA, snapB] = await Promise.all([
      getDoc(doc(db, "users", uidA, "friends", uidB)),
      getDoc(doc(db, "users", uidB, "friends", uidA)),
    ]);
    if (!snapA.exists() || !snapB.exists()) return false;
    return (
      snapA.data().status === "friends" && snapB.data().status === "friends"
    );
  } catch {
    return false;
  }
}
