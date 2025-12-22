import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { firestore } from "./firebase";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore"; // Added updateDoc
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
  
  // 1. Check if the user already exists
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // 2. USER EXISTS: Do NOT overwrite. Just update the lastLogin time.
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
    });
    return userSnap.data() as UserProfile;
  }

  // 3. USER DOES NOT EXIST: Create the new default profile.
  const newUserProfile: UserProfile = {
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
    return userSnap.data() as UserProfile;
  } else {
    return null;
  }
}