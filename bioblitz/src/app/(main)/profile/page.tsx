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
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Pencil } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import router from "next/router";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { FaDna, FaStethoscope } from "react-icons/fa";


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
  const { updateUserPhoto } = useAuth();

  const auth = getAuth(app);
  const db = getFirestore(app);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = getStorage(app);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [editing, setEditing] = useState(false);

  const [tempProfile, setTempProfile] = useState({
    bio: "",
    location: "",
    grade: "",
    status: "",
    school: "",
  });

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userProfile) return;
    const file = e.target.files[0];

    try {
      const profileImageRef = storageRef(
        storage,
        `profilePictures/${auth.currentUser?.uid}`
      );
      await uploadBytes(profileImageRef, file);
      const downloadURL = await getDownloadURL(profileImageRef);

      const userDocRef = doc(db, "users", auth.currentUser!.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      setUserProfile({ ...userProfile, photoURL: downloadURL });
      updateUserPhoto(downloadURL);
    } catch (err) {
      console.error("Error uploading profile picture:", err);
    }
  };

  const [setsPlayed, setSetsPlayed] = useState<
    { name: string; score: number }[]
  >([]);

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

        const setsData = setsSnap.docs.map((doc) => {
          const data = doc.data() as { score?: number };
          return {
            name: "Name:" + " " + doc.id,
            score: data.score || 0,
          };
        });

        setSetsPlayed(setsData);
      } catch (err) {
        console.error("Error fetching sets played:", err);
      }
    };

  }, [userProfile, auth.currentUser?.uid, db]);

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
          console.error("Error fetching user profile:", err);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="animate-pulse w-full max-w-5xl p-8 bg-zinc-900 rounded-2xl shadow-2xl space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 bg-zinc-700 rounded-full" />
            <div className="h-8 w-48 bg-zinc-700 rounded-md" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-32 bg-zinc-700 rounded-lg" />
            <div className="h-32 bg-zinc-700 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-32 bg-zinc-700 rounded-lg" />
            <div className="h-32 bg-zinc-700 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center space-y-6 bg-black">
      {userProfile && (
        <>
          <div className="w-full max-w-5xl bg-zinc-950 border-1 border-white/20 rounded-2xl shadow-2xl p-10 transform transition-all">
            <div className="flex flex-col items-center text-center border-b border-zinc-700 pb-8 mb-8 gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
              <div
                className="relative w-32 h-32 group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={userProfile.photoURL}
                  alt="Profile"
                  className="w-32 h-32 rounded-full object-cover transition-opacity duration-300 group-hover:opacity-50"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-xl cursor-pointer">
                  <Pencil className="w-8 h-8" />
                </div>
              </div>

              <div className="flex-1 space-y-2">
                <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-white">
                  {userProfile.displayName}
                </h1>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left card: Bio */}
              <div className="bg-zinc-900 p-6 rounded-xl shadow flex flex-col relative space-y-4">
                <h2 className="text-2xl font-semibold text-white mb-2">Bio</h2>

                <p className="text-zinc-400 font-medium">Player Since:</p>
                <p className="text-white font-semibold">
                  {userProfile.createdAt
                    ? new Date(
                        userProfile.createdAt.seconds * 1000
                      ).toLocaleDateString()
                    : "N/A"}
                </p>

                <div>
                  <p className="text-zinc-400 font-medium">About You:</p>
                  <p className="text-white">
                    {userProfile.bio || "Tells others about yourself.."}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-400 font-medium">Status:</p>
                  <p className="text-white">
                    {userProfile.status || "Tell others what you're up to.."}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-400 font-medium">Location:</p>
                  <p className="text-white">
                    {userProfile.location || "Tell others where you're from.."}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-400 font-medium">Grade:</p>
                  <p className="text-white">
                    {userProfile.grade || "Tell others what grade you're in.."}
                  </p>
                </div>

                <div>
                  <p className="text-zinc-400 font-medium">School:</p>
                  <p className="text-white">
                    {userProfile.school ||
                      "Tell others what school you go to.."}
                  </p>
                </div>

                <button
                  className="absolute bottom-4 right-4 bg-cyan-600 text-white px-4 py-2 rounded-xl hover:bg-cyan-900"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>

                {editing && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800/90 p-6 rounded-xl w-full max-w-md flex flex-col gap-4 relative">
                      <h3 className="text-xl font-semibold text-white">
                        Edit Profile
                      </h3>

                      <div className="flex flex-col">
                        <label className="text-white text-xl mb-1">
                          About You
                        </label>
                        <textarea
                          className="p-2 rounded bg-slate-600 text-white resize-none"
                          rows={3}
                          value={tempProfile.bio}
                          onChange={(e) =>
                            setTempProfile({
                              ...tempProfile,
                              bio: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-zinc-400 text-sm mb-1">
                          Status
                        </label>
                        <input
                          className="p-2 rounded bg-slate-600 text-white"
                          type="text"
                          value={tempProfile.status}
                          onChange={(e) =>
                            setTempProfile({
                              ...tempProfile,
                              status: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-zinc-400 text-sm mb-1">
                          Location
                        </label>
                        <input
                          className="p-2 rounded bg-slate-600 text-white"
                          type="text"
                          value={tempProfile.location}
                          onChange={(e) =>
                            setTempProfile({
                              ...tempProfile,
                              location: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-zinc-400 text-sm mb-1">
                          Grade
                        </label>
                        <input
                          className="p-2 rounded bg-slate-600 text-white"
                          type="text"
                          value={tempProfile.grade || ""}
                          onChange={(e) =>
                            setTempProfile({
                              ...tempProfile,
                              grade: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="flex flex-col">
                        <label className="text-zinc-400 text-sm mb-1">
                          School
                        </label>
                        <input
                          className="p-2 rounded bg-slate-600 text-white"
                          type="text"
                          value={tempProfile.school}
                          onChange={(e) =>
                            setTempProfile({
                              ...tempProfile,
                              school: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          className="bg-slate-900 px-4 py-2 rounded-sm hover:bg-slate-700 text-white"
                          onClick={() => setEditing(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="bg-cyan-900 px-4 py-2 rounded-sm hover:bg-cyan-600 text-white"
                          onClick={async () => {
                            const userDocRef = doc(
                              db,
                              "users",
                              auth.currentUser!.uid
                            );
                            await updateDoc(userDocRef, { ...tempProfile });
                            setUserProfile({ ...userProfile, ...tempProfile });
                            setEditing(false);
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-900 p-6 rounded-xl shadow flex flex-col">
                <h2 className="text-2xl font-semibold text-white mb-2">
                  Streak
                </h2>
              </div>
            </div>
          </div>

          <div className="w-full max-w-5xl bg-zinc-950  border-1 border-white/20 rounded-2xl shadow-2xl p-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Elo Ratings
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <EloCard
                icon={<FaDna />}
                label="USABO Elo"
                value={userProfile.bElo}
                color="green"
              />
              <EloCard
                icon={<FaDna />}
                label="USABO Unofficial Elo"
                value={userProfile.buElo}
                color="green"
              />
              <EloCard
                icon={<FaStethoscope />}
                label="MCAT Elo"
                value={userProfile.mElo}
                color="blue"
              />
              <EloCard
                icon={<FaStethoscope />}
                label="MCAT Unofficial Elo"
                value={userProfile.muElo}
                color="blue"
              />
            </div>
          </div>

          <div className="w-full max-w-5xl bg-zinc-950 border-1 border-white/20 rounded-2xl shadow-2xl p-10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Past Games Played
            </h2>
            <div className="relative">
              <button
                onClick={() =>
                  scrollRef.current?.scrollBy({
                    left: -250,
                    behavior: "smooth",
                  })
                }
                className="absolute top-1/2 -translate-y-1/2 bg-zinc-800 p-2 rounded-full shadow-lg z-10 hover:bg-zinc-700"
                style={{ left: "-35px" }}
              >
                <ChevronLeft className="text-white" />
              </button>

              <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar px-3"
              >
                {setsPlayed.map((set, i) => (
                  <div
                    key={i}
                    className="w-72 h-44 bg-zinc-800 rounded-xl flex flex-col text-white shrink-0 p-4"
                  >
                    <h3 className="text-lg font-semibold mb-2 text-left">
                      {set.name}
                    </h3>{" "}
                    <div className="text-lg text-zinc-300 text-left">
                      Score: {set.score}
                    </div>{" "}
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  scrollRef.current?.scrollBy({ left: 250, behavior: "smooth" })
                }
                className="absolute top-1/2 -translate-y-1/2 bg-zinc-800 p-2 rounded-full shadow-lg z-10 hover:bg-zinc-700"
                style={{ right: "-30px" }}
              >
                <ChevronRight className="text-white" />
              </button>
            </div>{" "}
          </div>
        </>
      )}
    </main>
  );
}

interface EloCardProps {
  icon: React.ReactElement;
  label: string;
  value: number;
  color: "green" | "blue";
}

const EloCard = ({ icon, label, value, color }: EloCardProps) => {
  const colorClass = color === "green" ? "text-green-400" : "text-blue-400";
  const barColorClass = color === "green" ? "bg-green-400" : "bg-blue-400";

  return (
    <div className="bg-zinc-800 p-6 rounded-xl flex flex-col items-center justify-center shadow hover:shadow-lg transition-shadow w-full">
      <div className={`${colorClass} text-4xl mb-2`}>{icon}</div>
      <p className="text-lg font-semibold">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      <div className="w-full h-2 bg-zinc-700 rounded-full mt-2">
        <div
          className={`h-2 rounded-full ${barColorClass}`}
          style={{ width: `${Math.min(value, 300) / 3}%` }}
        />
      </div>
    </div>
  );
};
