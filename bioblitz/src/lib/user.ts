
import { firestore } from "./firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  usaboRating: number;
  mcatRating: number;
  bio: string;
  grade: string;
  state: string;
}

export async function createUserProfile(user: any) {
  const userRef = doc(firestore, "users", user.uid);
  const userProfile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName?.[0] || "B"}&background=random`,
    usaboRating: 1500,
    mcatRating: 1500,
    bio: "",
    grade: "",
    state: "",
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
