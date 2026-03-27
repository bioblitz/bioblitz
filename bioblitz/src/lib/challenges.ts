// src/lib/challenges.ts
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  getFirestore,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import { deleteDoc } from "firebase/firestore";

const db = getFirestore(app);

export type ChallengeStatus = "pending" | "completed" | "expired";

export interface Challenge {
  id: string;
  blitzId: string;
  blitzTitle: string;
  challengerId: string;
  challengerUsername: string;
  challengerPhotoURL: string;
  challengerScore: number | null; // null until challenger plays
  challengerTimeTaken: number | null;
  challengedId: string;
  challengedUsername: string;
  challengedPhotoURL: string;
  challengedScore: number | null;
  challengedTimeTaken: number | null;
  status: ChallengeStatus;
  affectsElo: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  resolvedAt: Timestamp | null;
  winnerId: string | null;
}

/** Called when challenger declares a challenge BEFORE playing */
export async function createChallenge({
  blitzId,
  blitzTitle,
  challenger,
  challenged,
}: {
  blitzId: string;
  blitzTitle: string;
  challenger: { uid: string; username: string; photoURL: string };
  challenged: { uid: string; username: string; photoURL: string };
}): Promise<string> {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const ref = await addDoc(collection(db, "challenges"), {
    blitzId,
    blitzTitle,
    challengerId: challenger.uid,
    challengerUsername: challenger.username,
    challengerPhotoURL: challenger.photoURL,
    challengerScore: null,
    challengerTimeTaken: null,
    challengedId: challenged.uid,
    challengedUsername: challenged.username,
    challengedPhotoURL: challenged.photoURL,
    challengedScore: null,
    challengedTimeTaken: null,
    status: "pending",
    affectsElo: false,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
    resolvedAt: null,
    winnerId: null,
  });

  await createNotification(
    challenged.uid,
    "friend_request",
    `@${challenger.username} challenged you!`,
    `@${challenger.username} wants to compete on "${blitzTitle}". You have 48 hours to play.`,
    `/home/${blitzId}`,
    challenger.uid,
    challenger.photoURL,
    challenger.username,
  );

  return ref.id;
}

/** Called when a submission is graded — checks for open challenge and resolves it */
export async function tryResolveChallenge({
  blitzId,
  userId,
  score,
  timeTaken,
}: {
  blitzId: string;
  userId: string;
  score: number;
  timeTaken: number;
}): Promise<void> {
  // Check if this user is the CHALLENGER on a pending challenge
  const asChallenger = query(
    collection(db, "challenges"),
    where("blitzId", "==", blitzId),
    where("challengerId", "==", userId),
    where("status", "==", "pending"),
    limit(1),
  );
  const challengerSnap = await getDocs(asChallenger);
  if (!challengerSnap.empty) {
    const d = challengerSnap.docs[0];
    await updateDoc(d.ref, {
      challengerScore: score,
      challengerTimeTaken: timeTaken,
    });
    // If challenged has already played, resolve
    const data = d.data() as Challenge;
    if (data.challengedScore !== null) {
      await resolveChallenge(d.id, {
        ...data,
        challengerScore: score,
        challengerTimeTaken: timeTaken,
      });
    }
    return;
  }

  // Check if this user is the CHALLENGED on a pending challenge
  const asChallenged = query(
    collection(db, "challenges"),
    where("blitzId", "==", blitzId),
    where("challengedId", "==", userId),
    where("status", "==", "pending"),
    limit(1),
  );
  const challengedSnap = await getDocs(asChallenged);
  if (!challengedSnap.empty) {
    const d = challengedSnap.docs[0];
    const data = d.data() as Challenge;
    await updateDoc(d.ref, {
      challengedScore: score,
      challengedTimeTaken: timeTaken,
    });
    if (data.challengerScore !== null) {
      await resolveChallenge(d.id, {
        ...data,
        challengedScore: score,
        challengedTimeTaken: timeTaken,
      });
    }
  }
}

async function resolveChallenge(id: string, data: Challenge) {
  const hoursElapsed =
    (Date.now() - data.createdAt.toMillis()) / (1000 * 60 * 60);
  const affectsElo = hoursElapsed <= 24;

  const cs = data.challengerScore ?? 0;
  const ds = data.challengedScore ?? 0;
  const ct = data.challengerTimeTaken ?? Infinity;
  const dt = data.challengedTimeTaken ?? Infinity;

  let winnerId: string;
  if (cs > ds) winnerId = data.challengerId;
  else if (ds > cs) winnerId = data.challengedId;
  else winnerId = ct <= dt ? data.challengerId : data.challengedId;

  await updateDoc(doc(db, "challenges", id), {
    status: "completed",
    affectsElo,
    resolvedAt: serverTimestamp(),
    winnerId,
  });
}

export async function getUserChallenges(uid: string): Promise<Challenge[]> {
  const [sent, received] = await Promise.all([
    getDocs(
      query(
        collection(db, "challenges"),
        where("challengerId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(20),
      ),
    ),
    getDocs(
      query(
        collection(db, "challenges"),
        where("challengedId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(20),
      ),
    ),
  ]);

  const map = new Map<string, Challenge>();
  [...sent.docs, ...received.docs].forEach((d) => {
    map.set(d.id, { id: d.id, ...d.data() } as Challenge);
  });

  const now = Date.now();
  const all = Array.from(map.values());

  const deletePromises: Promise<void>[] = [];
  const active = all.filter((c) => {
    if (
      c.status === "pending" &&
      c.expiresAt?.toMillis?.() &&
      c.expiresAt.toMillis() < now
    ) {
      deletePromises.push(deleteDoc(doc(db, "challenges", c.id)));
      return false;
    }
    return true;
  });

  Promise.all(deletePromises).catch(console.error);

  return active.sort(
    (a, b) =>
      (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0),
  );
}

/** Get pending challenges where the user needs to respond (they are the challenged party
 *  and haven't played yet) */
export async function getPendingForUser(uid: string): Promise<Challenge[]> {
  const snap = await getDocs(
    query(
      collection(db, "challenges"),
      where("challengedId", "==", uid),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(10),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Challenge);
}

/** Check if user already has an open challenge on this blitz (either side) */
export async function hasOpenChallenge(
  uid: string,
  blitzId: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([
    getDocs(
      query(
        collection(db, "challenges"),
        where("challengerId", "==", uid),
        where("blitzId", "==", blitzId),
        where("status", "==", "pending"),
        limit(1),
      ),
    ),
    getDocs(
      query(
        collection(db, "challenges"),
        where("challengedId", "==", uid),
        where("blitzId", "==", blitzId),
        where("status", "==", "pending"),
        limit(1),
      ),
    ),
  ]);
  const now = Date.now();
  const allDocs = [...a.docs, ...b.docs];
  const valid = allDocs.filter((d) => {
    const data = d.data();
    const expired = data.expiresAt?.toMillis?.() < now;
    if (expired) deleteDoc(d.ref).catch(console.error);
    return !expired;
  });
  return valid.length > 0;
}

