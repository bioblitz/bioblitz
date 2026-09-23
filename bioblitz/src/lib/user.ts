import { firestore } from "./firebase";
import { applyUsernamePolicy } from "./usernamePolicy";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  FieldValue,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { uploadImage } from "./storage";

type AuthLikeUser = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

type CachedPhotoRecord = {
  sourceUrl: string;
  cachedUrl: string;
  cachedAt: number;
};

const PHOTO_CACHE_PREFIX = "bioblitz:photo-cache:";
const PHOTO_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

function readCachedPhoto(uid: string, sourceUrl: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${PHOTO_CACHE_PREFIX}${uid}`);
    if (!raw) return null;
    const cached = JSON.parse(raw) as CachedPhotoRecord;
    if (cached.sourceUrl !== sourceUrl) return null;
    if (Date.now() - cached.cachedAt > PHOTO_CACHE_TTL_MS) return null;
    return cached.cachedUrl;
  } catch {
    return null;
  }
}

function writeCachedPhoto(uid: string, sourceUrl: string, cachedUrl: string): void {
  if (typeof window === "undefined") return;
  try {
    const record: CachedPhotoRecord = {
      sourceUrl,
      cachedUrl,
      cachedAt: Date.now(),
    };
    window.localStorage.setItem(`${PHOTO_CACHE_PREFIX}${uid}`, JSON.stringify(record));
  } catch {
    // Best-effort cache only.
  }
}

export interface UserProfile {
  uid: string;
  username: string | null;
  displayName: string;
  email: string;
  photoURL: string;
  roles?: string[];
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
  subscriberCount?: number;
  marketingConsent?: boolean,
  marketingConsentAskedAt?: Timestamp | FieldValue;
  /**
   * True for an account that has a username but has not been through the rest
   * of onboarding — the state left by signing in from a live invite link,
   * where only the username is asked for so the room is not kept waiting.
   */
  onboardingPending?: boolean;
}

export async function isUsernameUnique(username: string): Promise<boolean> {
  const usersRef = collection(firestore, "users");
  const q = query(usersRef, where("username", "==", username.toLowerCase()));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
}

export async function updateUsername(
  uid: string,
  username: string,
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  const { value: sanitized, censored } = await applyUsernamePolicy(username);
  if (censored) {
    throw new Error("Inappropriate username, try again.");
  }
  await updateDoc(userRef, {
    username: sanitized.toLowerCase(),
    nameChangedAt: serverTimestamp(),
  });
}

export async function updateMarketingPreference(
  uid: string,
  consent: boolean,
  source: string = "unknown",
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  // Merged rather than updated: this is the record that stops the opt-in popup
  // from asking again, so it must land even on a profile that is missing or
  // mid-creation.
  await setDoc(
    userRef,
    {
    marketingConsent: consent,
    marketingConsentAskedAt: serverTimestamp(),
    },
    { merge: true },
  );

  try {
    await fetch("/api/analytics/marketing-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: consent ? "accepted" : "declined",
        source,
        reason: "user_preference_update",
      }),
    });
  } catch {
    // best-effort analytics only
  }
}

/**
 * Records whether this account still owes the rest of onboarding.
 *
 * Merged rather than updated so it lands on a profile that is still being
 * created, which is exactly the case it exists for.
 */
export async function setOnboardingPending(
  uid: string,
  pending: boolean,
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await setDoc(userRef, { onboardingPending: pending }, { merge: true });
}

export async function updateUserBanner(
  uid: string,
  bannerURL: string,
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    bannerURL: bannerURL,
  });
}

export async function updateChannelName(
  uid: string,
  channelName: string,
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    channelName: channelName,
  });
}

export async function updateUserPhoto(
  uid: string,
  photoURL: string,
): Promise<void> {
  const userRef = doc(firestore, "users", uid);
  await updateDoc(userRef, {
    photoURL: photoURL,
  });
}

export async function cacheUserPhotoURL(
  uid: string,
  photoURL: string,
): Promise<string | null> {
  if (!photoURL || !photoURL.includes("googleusercontent.com")) {
    return null;
  }

  const locallyCached = readCachedPhoto(uid, photoURL);
  if (locallyCached) {
    await updateUserPhoto(uid, locallyCached);
    return locallyCached;
  }

  try {
    const response = await fetch(photoURL);
    if (!response.ok) return null;
    const blob = await response.blob();
    const extension = blob.type?.includes("png") ? "png" : "jpg";
    const file = new File([blob], `avatar.${extension}`, { type: blob.type });
    const path = `avatars/${uid}/${Date.now()}.${extension}`;
    const cachedUrl = await uploadImage(file, path);
    await updateUserPhoto(uid, cachedUrl);
    writeCachedPhoto(uid, photoURL, cachedUrl);
    return cachedUrl;
  } catch (error) {
    console.warn("Failed to cache user photo:", error);
    return null;
  }
}

export async function createUserProfile(user: AuthLikeUser) {
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
    photoURL: user.photoURL || "",
    bElo: 500,
    mElo: 0,
    buElo: 0,
    muElo: 0,
    bio: "",
    location: "",
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    nameChangedAt: serverTimestamp(),
    subscriberCount: 0,
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
  username: string,
): Promise<UserProfile | null> {
  const usersRef = collection(firestore, "users");
  const normalized = username.toLowerCase();

  const q = query(usersRef, where("username", "==", normalized));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    const userProfile = userDoc.data() as UserProfile;
    userProfile.uid = userDoc.id;
    return userProfile;
  }

  const userRef = doc(firestore, "users", username);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userProfile = userSnap.data() as UserProfile;
    userProfile.uid = username;
    return userProfile;
  }

  return null;
}
