"use client";

import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import {
  doc,
  getDoc,
  getDocs,
  getFirestore,
  updateDoc,
  collection,
  Timestamp,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { motion } from "framer-motion";
import { Inter } from "next/font/google";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string;
  bElo: number;
  buElo: number;
  muElo: number;
  mElo: number;
  bio: string;
  createdAt: Timestamp;
  location: string;
  grade?: string;
  status?: string;
  school?: string;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tempProfile, setTempProfile] = useState({
    bio: "",
    location: "",
    grade: "",
    status: "",
    school: "",
  });
  const [setsPlayed, setSetsPlayed] = useState<
    { name: string; score: number }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const router = useRouter();

  useEffect(() => {
    if (userProfile) {
      setTempProfile({
        bio: userProfile.bio || "",
        location: userProfile.location || "",
        grade: userProfile.grade || "",
        status: userProfile.status || "",
        school: userProfile.school || "",
      });
    }
  }, [userProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else {
            setError("Could not find user profile. Please contact support.");
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError("An error occurred while loading your profile.");
        } finally {
          setLoading(false);
        }
      } else {
        router.push("/auth");
      }
    });

    return () => unsubscribe();
  }, [auth, db, router]);

  useEffect(() => {
    if (!userProfile) return;
    const fetchSetsPlayed = async () => {
      try {
        const setsRef = collection(
          db,
          "users",
          auth.currentUser!.uid,
          "setsPlayed"
        );
        const setsSnap = await getDocs(setsRef);
        const setsData = setsSnap.docs.map((doc) => ({
          name: "Name: " + doc.id,
          score: (doc.data() as { score?: number }).score || 0,
        }));
        setSetsPlayed(setsData);
      } catch (err) {
        console.error("Error fetching sets played:", err);
      }
    };
    fetchSetsPlayed();
  }, [userProfile, db, auth]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userProfile) return;
    const file = e.target.files[0];

    try {
      const profileRef = storageRef(
        storage,
        `profilePictures/${auth.currentUser?.uid}`
      );
      await uploadBytes(profileRef, file);
      const downloadURL = await getDownloadURL(profileRef);

      await updateDoc(doc(db, "users", auth.currentUser!.uid), {
        photoURL: downloadURL,
      });
      setUserProfile({ ...userProfile, photoURL: downloadURL });
    } catch (err) {
      console.error("Error uploading profile picture:", err);
    }
  };

  const saveChanges = async () => {
    try {
      const userRef = doc(db, "users", auth.currentUser!.uid);
      await updateDoc(userRef, tempProfile);
      setUserProfile({ ...userProfile!, ...tempProfile });
      setEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="animate-pulse text-zinc-500">Loading profile...</div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-red-500">{error}</p>
      </div>
    );

  return (
    <main className={`${inter.className} min-h-screen bg-black text-white p-8`}>
      <div className="max-w-5xl mx-auto space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-8 text-center shadow-lg"
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div
            className="relative inline-block cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt=""
                className="w-32 h-32 rounded-full object-cover border border-zinc-700 mx-auto group-hover:opacity-60 transition duration-300"
              />
            ) : (
              <div className="w-32 h-32 rounded-full border border-zinc-700 mx-auto flex items-center justify-center bg-[#8c52ff] text-white text-[64px] font-bold">
                {userProfile?.displayName?.[0].toUpperCase() || "U"}
              </div>
            )}
            <Pencil className="absolute inset-0 m-auto opacity-0 group-hover:opacity-100 text-[#8c52ff] transition" />
          </div>

          <h1 className="text-3xl font-bold mt-4">
            {userProfile?.displayName}
          </h1>
          <p className="text-sm text-gray-400">{userProfile?.email}</p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-semibold">Profile Information</h2>
            <button
              onClick={() => setEditing(true)}
              className="bg-[#5CA3FF] text-black px-3 py-1 rounded-xl font-semibold hover:scale-105 transition-transform"
            >
              Edit
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-gray-300">
            <p>
              <span className="text-[#5CA3FF] font-bold">Bio:</span>{" "}
              {userProfile?.bio || "Tell others about yourself"}
            </p>
            <p>
              <span className="text-[#5CA3FF] font-bold">Status:</span>{" "}
              {userProfile?.status || "Set your status"}
            </p>
            <p>
              <span className="text-[#5CA3FF] font-bold">Location:</span>{" "}
              {userProfile?.location || "Add location"}
            </p>
            <p>
              <span className="text-[#5CA3FF] font-bold">Grade:</span>{" "}
              {userProfile?.grade || "Not specified"}
            </p>
            <p>
              <span className="text-[#5CA3FF] font-bold">School:</span>{" "}
              {userProfile?.school || "Not specified"}
            </p>
            <p>
              <span className="text-[#5CA3FF] font-bold">Player Since:</span>{" "}
              {userProfile?.createdAt
                ? new Date(
                    userProfile.createdAt.seconds * 1000
                  ).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-6 shadow-lg relative"
        >
          <h2 className="text-2xl font-semibold mb-4">Recent Sets Played</h2>

          {setsPlayed.length === 0 ? (
            <p className="text-gray-400">No sets played yet.</p>
          ) : (
            <>
              {/* Left Arrow */}
              <button
                onClick={() => {
                  document
                    .getElementById("setsScroll")
                    ?.scrollBy({ left: -250, behavior: "smooth" });
                }}
                className="absolute top-1/2 -translate-y-1/2 left-2 bg-zinc-800 p-2 rounded-full shadow hover:bg-zinc-700 z-10"
              >
                &larr;
              </button>

              {/* Right Arrow */}
              <button
                onClick={() => {
                  document
                    .getElementById("setsScroll")
                    ?.scrollBy({ left: 250, behavior: "smooth" });
                }}
                className="absolute top-1/2 -translate-y-1/2 right-2 bg-zinc-800 p-2 rounded-full shadow hover:bg-zinc-700 z-10"
              >
                &rarr;
              </button>

              {/* Scrollable container */}
              <div
                id="setsScroll"
                className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar"
              >
                {setsPlayed.map((set, i) => (
                  <div
                    key={i}
                    className="min-w-[200px] flex-shrink-0 bg-zinc-900 p-4 rounded-xl text-sm"
                  >
                    <span className="block text-gray-300">{set.name}</span>
                    <span className="block text-[#8c52ff] font-semibold text-lg mt-1">
                      {set.score}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.section>

        <div className="text-center mt-6">
          <Link
            href="/home"
            className="text-[#8c52ff]/80 hover:underline text-sm tracking-wide"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-xl font-bold text-center">Edit Profile</h2>
            {Object.keys(tempProfile).map((key) => (
              <div key={key}>
                <label className="block text-sm text-gray-400 capitalize mb-1">
                  {key}
                </label>
                <input
                  type="text"
                  value={(tempProfile as any)[key]}
                  onChange={(e) =>
                    setTempProfile({ ...tempProfile, [key]: e.target.value })
                  }
                  className="w-full bg-zinc-800 text-white p-2 rounded-xl border border-zinc-700"
                />
              </div>
            ))}
            <div className="flex justify-between mt-4">
              <button
                onClick={saveChanges}
                className="bg-[#8c52ff]/80 text-black px-4 py-2 rounded-xl font-semibold hover:scale-105 transition-transform"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="bg-zinc-700 text-white px-4 py-2 rounded-xl hover:bg-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
