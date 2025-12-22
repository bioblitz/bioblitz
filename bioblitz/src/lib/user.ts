import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { firestore } from "./firebase";
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

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
}

export async function isUsernameUnique(username: string): Promise<boolean> {
  const usersRef = collection(firestore, "users");
  const q = query(usersRef, where("username", "==", username));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
}

export async function updateUsername(uid: string, username: string): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    username: username,
    nameChangedAt: serverTimestamp()
  });
}

export async function createUserProfile(user: any) {
  const userRef = doc(firestore, "users", user.uid);
  
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      lastLogin: serverTimestamp()
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