"use client";

import { motion } from "framer-motion";
import { Inter } from "next/font/google";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { Loader2, Info, Camera } from "lucide-react";
import ImageCropper from "@/components/ui/ImageCropper";
import { uploadImage } from "@/lib/storage";
import { updateUserPhoto } from "@/lib/user";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [gregoryMode, setGregoryMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [profileData, setProfileData] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>("image/jpeg");
  const [pfpLoading, setPfpLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const db = getFirestore(app);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const type = file.type || "image/jpeg";
      setImageType(type);
      
      const reader = new FileReader();
      reader.onload = () => {
        setImageToEdit(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    if (!user) return;
    
    setPfpLoading(true);
    setImageToEdit(null);
    
    try {
      const extension = imageType.split("/")[1] || "jpg";
      const file = new File([croppedImage], `pfp-${Date.now()}.${extension}`, { type: imageType });
      const filePath = `userPhotos/${user.uid}/${file.name}`;
      const downloadURL = await uploadImage(file, filePath);
      await updateUserPhoto(user.uid, downloadURL);
      
      setProfileData((prev: any) => ({
        ...prev,
        photoURL: downloadURL,
      }));
    } catch (error) {
      console.error("Error uploading profile photo:", error);
    } finally {
      setPfpLoading(false);
    }
  };

  const handleCropCancel = () => {
    setImageToEdit(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

      // Remove search index entries for this user and their channel
      await Promise.all([
        deleteDoc(doc(db, "search_index", `user_${uid}`)),
        deleteDoc(doc(db, "search_index", `channel_${uid}`)),
      ].map((p) => p.catch(() => {})));

      console.log("User data deleted successfully!");
    } catch (error) {
      console.error("Error deleting user data:", error);
      throw error;
    }
  };
  useEffect(() => {
    const email = localStorage.getItem("emailNotifications");
    const gregory = localStorage.getItem("gregoryMode");

    if (email !== null) setEmailNotifications(email === "true");
    if (gregory !== null) setGregoryMode(gregory === "true");
  }, []);

  useEffect(() => {
    if (profileData) {
      const preference = profileData.emailNotifications ?? true;
      setEmailNotifications(preference);
    }
  }, [profileData]);

  const handleEmailToggle = async (checked: boolean) => {
    setEmailNotifications(checked);
    localStorage.setItem("emailNotifications", checked.toString());

    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          emailNotifications: checked,
        });
        console.log("Email preference saved to Firestore");
      } catch (error) {
        console.error("Failed to save email preference:", error);
        setEmailNotifications(!checked);
        setToastMessage("Failed to save setting");
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };
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
        router.push("/auth");
      } else {
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
      <main className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </main>
    );
  }
  return (
      <main
      className={`${inter.className} min-h-screen bg-neutral-900 text-white p-8 pl-16 overflow-y-auto pt-24`}
    >
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-neutral-500 text-black px-4 py-2 rounded-xl shadow-lg z-50"
        >
          {toastMessage}
        </motion.div>
      )}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-left mb-8">
          Settings & Preferences
        </h1>
          <h2 className="text-2xl mb-4">Profile</h2>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          />
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              <img
                src={profileData?.photoURL || user?.photoURL}
                alt="Profile picture"
                className="w-16 h-16 rounded-full object-cover border border-zinc-700"

              />
            </div>
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
            className="bg-neutral-300 border px-4 py-2 mb-10 rounded-lg text-neutral-800 font-semibold hover:scale-105 transition-transform inline-block"
          >
            View Profile
          </Link>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl p-6 mb-6"
        >
          <h2 className="text-2xl mb-4">Email Preferences</h2>
          <div className="flex items-center justify-between">
            <p>Receive Email Notifications</p>
            <Switch
              checked={emailNotifications}
              onCheckedChange={handleEmailToggle}
              className="transition-colors duration-200 data-[state=checked]:bg-neutral-200 data-[state=unchecked]:bg-zinc-600"
            />
          </div>
          <p className="text-sm text-gray-400 mt-3">
            Turn on/off email notifications for updates, announcements, and
            other notifications
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-neutral-900 rounded-3xl p-6"
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
              className="bg-blue-200 transition-colors px-4 py-2 rounded-xl w-full text-left text-black font-semibold"
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
            className="text-neutral-500 hover:underline text-sm tracking-wide"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
