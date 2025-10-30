
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { firestore } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

export interface UserProfile {
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
}

export async function createUserProfile(user: any) {
  const userRef = doc(firestore, "users", user.uid);
  const userProfile: UserProfile = {
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || null,
    bElo: 1500,
    mElo: 1500,
    buElo: 1500,
    muElo: 1500,
    bio: "",
    location: "",
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    nameChangedAt: serverTimestamp(),
  };

  await setDoc(userRef, userProfile);
  return userProfile;
}

export async function getUserProfile(uid: string) {
  const userRef = doc(firestore, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  } else {
    return null;
  }
}
