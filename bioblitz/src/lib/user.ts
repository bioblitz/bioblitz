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
  channelName?: string;
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

export async function updateChannelName(
  uid: string,
  channelName: string
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    channelName: channelName,
  });
}

export async function updateUserPhoto(uid: string, photoURL: string): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    photoURL: photoURL,
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

export async function getUserProfileByUsername(username: string): Promise<UserProfile | null> {
  const usersRef = collection(firestore, "users");
  
  // Try exact match first
  let q = query(usersRef, where("username", "==", username));
  let querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    console.log("User found with username:", username);
    const userDoc = querySnapshot.docs[0];
    const userProfile = userDoc.data() as UserProfile;
    userProfile.uid = userDoc.id;
    return userProfile;
  }
  
  // If no exact match, try case-insensitive search
  console.log("Exact match not found, trying case-insensitive search for:", username);
  const normalizedUsername = username.toLowerCase();
  const allUsersSnapshot = await getDocs(usersRef);
  
  const matchingDoc = allUsersSnapshot.docs.find(doc => {
    const docUsername = doc.data().username;
    return docUsername && docUsername.toLowerCase() === normalizedUsername;
  });

  if (matchingDoc) {
    console.log("User found with case-insensitive match:", matchingDoc.data().username);
    const userProfile = matchingDoc.data() as UserProfile;
    userProfile.uid = matchingDoc.id;
    return userProfile;
  }
  
  console.log("User not found with username:", username);
  return null;
}