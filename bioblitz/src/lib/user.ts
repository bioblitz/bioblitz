import { firestore } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  increment,
  FieldValue,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

export interface UserProfile {
  uid: string;
  username: string | null;
  displayName: string;
  email: string;
  photoURL: string;
  bElo: number;
  buElo: number;
  muElo: number;
  mElo: number;
  bio: string;
  location: string;
  createdAt: Timestamp | FieldValue;
  lastLogin: Timestamp | FieldValue;
  nameChangedAt: Timestamp | FieldValue;
  bannerURL?: string;
}

export async function isUsernameUnique(username: string): Promise<boolean> {
  const usersRef = collection(firestore, "users");
  const q = query(usersRef, where("username", "==", username));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
}

export async function updateUsername(
  uid: string,
  username: string
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    username: username,
    nameChangedAt: serverTimestamp(),
  });
}

export async function updateUserBanner(
  uid: string,
  bannerURL: string
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    bannerURL: bannerURL,
  });
}

export async function createUserProfile(user: any) {
  const userRef = doc(firestore, "users", user.uid);

  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
    });
    const userProfile = userSnap.data() as UserProfile;
    userProfile.uid = user.uid;
    return userProfile;
  }

  const newUserProfile: UserProfile = {
    uid: user.uid,
    username: null,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || null,
    bElo: 0,
    mElo: 0,
    buElo: 0,
    muElo: 0,
    bio: "",
    location: "",
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    nameChangedAt: serverTimestamp(),
  };

  await setDoc(userRef, newUserProfile);
  return newUserProfile;
}

export async function getUserProfile(uid: string) {
  const userRef = doc(firestore, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userProfile = userSnap.data() as UserProfile;
    userProfile.uid = uid;
    return userProfile;
  } else {
    return null;
  }
}

export async function getUserProfileByUsername(
  username: string
): Promise<UserProfile | null> {
  const usersRef = collection(firestore, "users");
  const q = query(usersRef, where("username", "==", username));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    const userProfile = userDoc.data() as UserProfile;
    userProfile.uid = userDoc.id;
    return userProfile;
  } else {
    return null;
  }
}

export const updateUserStreak = async (db: any, userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const lastDate = data.lastStreakDate?.toDate();
      const now = new Date();

      if (!lastDate) {
        await updateDoc(userRef, {
          streak: 1,
          lastStreakDate: serverTimestamp(),
        });
        return;
      }

      const lastDateUTC = Date.UTC(
        lastDate.getUTCFullYear(),
        lastDate.getUTCMonth(),
        lastDate.getUTCDate()
      );

      const todayUTC = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      );

      const msPerDay = 1000 * 60 * 60 * 24;
      const diffDays = Math.floor((todayUTC - lastDateUTC) / msPerDay);

      if (diffDays === 1) {
        await updateDoc(userRef, {
          streak: increment(1),
          lastStreakDate: serverTimestamp(),
        });
      } else if (diffDays > 1) {
        await updateDoc(userRef, {
          streak: 1,
          lastStreakDate: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error("Error updating streak:", error);
  }
};
