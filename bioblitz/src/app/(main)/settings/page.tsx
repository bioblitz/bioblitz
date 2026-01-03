"use client";

import { motion } from "framer-motion";
import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  User,
} from "firebase/auth";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import {
  getFirestore,
  collection,
  getDoc,
  doc,
  query,
  where,
  getDocs,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { Loader2 } from "lucide-react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function SettingsPage() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [volume, setVolume] = useState(70);
  const [gregoryMode, setGregoryMode] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const router = useRouter();
  const db = getFirestore(app);

  const deleteSubcollection = async (path: string) => {
    const colRef = collection(db, path);
    const colDocs = await getDocs(colRef);
    await Promise.all(colDocs.docs.map((docSnap) => deleteDoc(docSnap.ref)));
  };

  const deleteUserData = async (uid: string) => {
    try {
      console.log("Starting deletion for UID:", uid);
      console.log("Removing user from friends' lists...");
      const myFriendsRef = collection(db, "users", uid, "friends");
      const myFriendsSnap = await getDocs(myFriendsRef);
      const removalPromises = myFriendsSnap.docs.map((friendDoc) => {
        const friendId = friendDoc.id;
        const refInFriendList = doc(db, "users", friendId, "friends", uid);
        return deleteDoc(refInFriendList);
      });
      await Promise.all(removalPromises);
      console.log("Removed user from all friend connections.");
      const gameQuery = query(
        collection(db, "gameSubmissions"),
        where("userId", "==", uid)
      );
      const gameDocs = await getDocs(gameQuery);
      await Promise.all(gameDocs.docs.map((gDoc) => deleteDoc(gDoc.ref)));

      const directUserRef = doc(db, "users", uid);
      const directUserSnap = await getDoc(directUserRef);

      if (directUserSnap.exists()) {
        console.log("Found user doc by ID. Deleting...");
        await deleteSubcollection(`users/${uid}/setsPlayed`);
        await deleteSubcollection(`users/${uid}/friends`);
        await deleteDoc(directUserRef);
      } else {
        console.log("User doc not found by ID. Trying query...");
        const userQuery = query(
          collection(db, "users"),
          where("uid", "==", uid)
        );
        const userDocs = await getDocs(userQuery);

        for (const userDoc of userDocs.docs) {
          const docId = userDoc.id;
          await deleteSubcollection(`users/${docId}/setsPlayed`);
          await deleteSubcollection(`users/${docId}/friends`);
          await deleteDoc(userDoc.ref);
        }
      }

      console.log("User data deleted successfully!");
    } catch (error) {
      console.error("Error deleting user data:", error);
      throw error;
    }
  };
  useEffect(() => {
    const sound = localStorage.getItem("soundEnabled");
    const animation = localStorage.getItem("animationEnabled");
    const email = localStorage.getItem("emailNotifications");
    const gregory = localStorage.getItem("gregoryMode");

    if (sound !== null) setSoundEnabled(sound === "true");
    if (animation !== null) setAnimationEnabled(animation === "true");
    if (email !== null) setEmailNotifications(email === "true");
    if (gregory !== null) setGregoryMode(gregory === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem("soundEnabled", soundEnabled.toString());
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("animationEnabled", animationEnabled.toString());
  }, [animationEnabled]);

  useEffect(() => {
    localStorage.setItem("emailNotifications", emailNotifications.toString());
  }, [emailNotifications]);

  useEffect(() => {
    if (gregoryMode) {
      document.body.style.filter = "sepia(1) hue-rotate(275deg) saturate(6)";
      document.body.style.transition = "none";
    } else {
      document.body.style.filter = "none";
      document.body.style.transition = "none";
    }
  }, [gregoryMode]);

  useEffect(() => {
    const auth = getAuth(app);
    let unsubscribeFirestore: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // 1. If no user, redirect immediately
        router.push("/auth");
      } else {
        // 2. If user exists, save them and stop loading
        setUser(currentUser);
        setCheckingAuth(false);

        const userDocRef = doc(db, "users", currentUser.uid);

        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setProfileData(data);
            setUsername(data.username ?? null);
          }
          setIsProfileLoading(false);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, [db, router]);

  const handleSignOut = async () => {
    const auth = getAuth(app);
    await signOut(auth);
    router.push("/auth");
  };
  const handleDeleteAccount = async () => {
    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const confirmed = confirm(
      "Are you sure you want to permanently delete your account?"
    );
    if (!confirmed) return;

    const walrusChorus =
      "I am the egg man, they are the egg men, I am the walrus, goo goo g'joob";
    const userInput = prompt(
      `Security Verification: To confirm deletion, type the following phrase exactly:\n\n${walrusChorus}`
    );
    if (userInput !== walrusChorus) {
      alert("Incorrect phrase. Deletion cancelled.");
      return;
    }

    try {
      await deleteUserData(currentUser.uid);
      await deleteUser(currentUser);
      alert("Account and all associated data deleted successfully.");
      router.push("/auth");
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login") {
        const reConfirm = confirm(
          "For security, you must sign in again to confirm deletion. Sign in now?"
        );
        if (reConfirm) {
          try {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(currentUser, provider);
            await deleteUserData(currentUser.uid);
            await deleteUser(currentUser);
            alert("Account and all associated data deleted successfully.");
            router.push("/auth");
          } catch (reAuthError) {
            console.error("Re-auth failed", reAuthError);
            alert("Verification failed. Account was not deleted.");
          }
        }
      } else {
        console.error("Error deleting user:", error);
        alert("An error occurred. Please try again later.");
      }
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </main>
    );
  }
  return (
    <main
      className={`${inter.className} min-h-screen bg-black text-white p-8 overflow-y-auto pt-24`}
    >
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigo-500 text-black px-4 py-2 rounded-xl shadow-lg z-50"
        >
          {toastMessage}
        </motion.div>
      )}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Settings & Preferences
        </h1>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-4">
            {isProfileLoading ? (
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-gray-400 animate-pulse">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : profileData?.photoURL || user?.photoURL ? (
              <img
                src={profileData?.photoURL || user?.photoURL}
                alt="Profile picture"
                className="w-16 h-16 rounded-full object-cover border border-zinc-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-gray-400">
                {profileData?.displayName?.[0] || user?.displayName?.[0] || "?"}
              </div>
            )}

            <div>
              <p className="font-medium">
                {profileData?.displayName ||
                  user?.displayName ||
                  "Unnamed User"}
              </p>
              <p className="text-sm text-gray-400">
                {user?.email || "No email available"}
              </p>
            </div>
          </div>
          <Link
            href={username ? `/profile/${username}` : "#"}
            className="bg-indigo-500 px-4 py-2 rounded-xl text-black font-semibold hover:scale-105 transition-transform inline-block"
          >
            View Profile
          </Link>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold mb-4">Sound & Animation</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p>Sound Effects</p>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
                className="transition-colors duration-200 data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-zinc-800"
              />
            </div>
            <div className="flex items-center justify-between">
              <p>Animation Effects</p>
              <Switch
                checked={animationEnabled}
                onCheckedChange={setAnimationEnabled}
                className="transition-colors duration-200 data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-zinc-800"
              />
            </div>
            <div className="flex items-center justify-between">
              <p>Volume</p>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-40 accent-[#5CA3FF]/80"
              />

              <span>{volume}%</span>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold mb-4">Email Preferences</h2>
          <div className="flex items-center justify-between">
            <p>Receive Email Notifications</p>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
              className="transition-colors duration-200 data-[state=checked]:bg-indigo-500 data-[state=unchecked]:bg-zinc-800"
            />
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Turn on/off email notifications for updates, announcements, and game
            summaries.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold mb-4">Privacy & Security</h2>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p>Who can see your profile?</p>
              <select
                value={profileVisibility}
                onChange={(e) => setProfileVisibility(e.target.value)}
                className="bg-zinc-900 text-white rounded-xl p-2 border border-zinc-700"
              >
                <option value="public">Everyone</option>
                <option value="friends">Friends only</option>
                <option value="private">Only me</option>
              </select>
            </div>
            <p className="text-sm text-gray-400">
              Choose who can view your profile and search for your information.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 mb-6"
        >
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            Experimental
            {gregoryMode && (
              <span className="text-xs bg-pink-500 text-white px-2 py-1 rounded-full">
                ON
              </span>
            )}
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className={gregoryMode ? "text-pink-500 font-bold" : ""}>
                Gregory Mode
              </p>
            </div>
            <Switch
              checked={gregoryMode}
              onCheckedChange={(val) => {
                setGregoryMode(val);
                localStorage.setItem("gregoryMode", val.toString());
              }}
              className="transition-colors duration-200 data-[state=checked]:bg-pink-600 data-[state=unchecked]:bg-zinc-800"
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6"
        >
          <h2 className="text-2xl font-semibold mb-1">Account</h2>
          <p className="text-sm text-gray-400 mb-4">
            Signed in with Google as{" "}
            <span className="text-orange-400 font-medium">
              {user?.email || "No email available"}
            </span>
          </p>
          <div className="space-y-4">
            <button
              onClick={handleSignOut}
              className="bg-[#5CA3FF]/80 hover:bg-[#5CA3FF]/60 transition-colors px-4 py-2 rounded-xl w-full text-left text-black font-semibold"
            >
              Sign Out
            </button>
            <button
              onClick={handleDeleteAccount}
              className="bg-red-400/80 hover:bg-red-400/60 transition-colors px-4 py-2 rounded-xl w-full text-left font-semibold text-black"
            >
              Delete Account
            </button>
          </div>
        </motion.section>

        <div className="text-center mt-8">
          <Link
            href="/home"
            className="text-[#8c52ff] hover:underline text-sm tracking-wide"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
