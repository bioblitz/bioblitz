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
  writeBatch, // <--- Added for Friend Requests
  setDoc,     // <--- Added for Friend Requests
  query, 
  where,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  Pencil,
  MapPin,
  School,
  GraduationCap,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  Save,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Inter } from "next/font/google";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { isUsernameUnique } from "@/lib/user";
import Link from "next/link";
import { useParams } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

interface UserProfile {
  uid: string;
  displayName: string;
  username: string | null;
  email: string;
  photoURL: string;
  bElo: number;
  bio: string;
  createdAt: Timestamp;
  location: string;
  grade?: string;
  school?: string;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [tempProfile, setTempProfile] = useState({
    bio: "",
    location: "",
    grade: "",
    school: "",
    displayName: "",
    username: "",
  });
  const [setsPlayed, setSetsPlayed] = useState<
    { name: string; score: number }[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const router = useRouter();

  // Friendship State
  const [friendshipStatus, setFriendshipStatus] = useState<
    "none" | "sent" | "received" | "friends"
  >("none");
  
  const params = useParams();
  const profileUid = params.uid as string;

  // ... (Existing useEffect for loading Profile Data remains the same) ...
  useEffect(() => {
    if (userProfile) {
      setTempProfile({
        bio: userProfile.bio || "",
        location: userProfile.location || "",
        grade: userProfile.grade || "",
        school: userProfile.school || "",
        displayName: userProfile.displayName || "",
        username: userProfile.username || "",
      });
    }
  }, [userProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", profileUid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else {
            setError("Profile data unavailable.");
          }
        } catch (err) {
          setError("Unable to load profile.");
        } finally {
          setLoading(false);
        }
      } else {
        router.push("/auth");
      }
    });

    return () => unsubscribe();
  }, [auth, db, router, profileUid]);

  // ... (Existing useEffect for Sets Played remains the same) ...
  useEffect(() => {
    if (!userProfile) return;
    const fetchSetsPlayed = async () => {
      try {
        const setsRef = collection(db, "users", profileUid, "setsPlayed");
        const setsSnap = await getDocs(setsRef);

        const sortedDocs = setsSnap.docs.sort((a, b) => {
          const dataA = a.data();
          const dataB = b.data();
          const timeA = dataA.lastPlayedAt?.toMillis() || dataA.playedAt?.toMillis() || 0;
          const timeB = dataB.lastPlayedAt?.toMillis() || dataB.playedAt?.toMillis() || 0;
          return timeA - timeB;
        });

        const setsData = sortedDocs.map((doc) => {
          const data = doc.data();
          return {
            name: data.title || "Unknown Set",
            score: data.score || 0,
          };
        });

        setSetsPlayed(setsData);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSetsPlayed();
  }, [userProfile, db, auth, profileUid]);

  // --- UPDATED FRIENDSHIP CHECK (Sub-collection) ---
  useEffect(() => {
    if (!userProfile || !auth.currentUser || auth.currentUser.uid === profileUid) return;

    const checkFriendship = async () => {
      try {
        // We only need to check MY list. 
        // If I have a document for YOU, I know the status.
        const myFriendDocRef = doc(db, "users", auth.currentUser!.uid, "friends", profileUid);
        const docSnap = await getDoc(myFriendDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setFriendshipStatus(data.status); // "sent", "received", or "friends"
        } else {
          setFriendshipStatus("none");
        }
      } catch (err) {
        console.error("Error checking friendship:", err);
      }
    };

    checkFriendship();
  }, [userProfile, auth.currentUser, db, profileUid]);

  // --- UPDATED ADD FRIEND FUNCTION (Batch Write) ---
  const sendFriendRequest = async () => {
    if (!auth.currentUser || !userProfile) return;

    try {
      const batch = writeBatch(db);

      // 1. Add to MY subcollection (Status: Sent)
      const myRef = doc(db, "users", auth.currentUser.uid, "friends", profileUid);
      batch.set(myRef, {
        uid: profileUid,
        status: "sent",
        createdAt: Timestamp.now(),
        displayName: userProfile.displayName, // Cache name
        photoURL: userProfile.photoURL        // Cache photo
      });

      // 2. Add to THEIR subcollection (Status: Received)
      const theirRef = doc(db, "users", profileUid, "friends", auth.currentUser.uid);
      batch.set(theirRef, {
        uid: auth.currentUser.uid,
        status: "received",
        createdAt: Timestamp.now(),
        displayName: auth.currentUser.displayName || "Unknown",
        photoURL: auth.currentUser.photoURL || ""
      });

      await batch.commit();
      setFriendshipStatus("sent");

    } catch (err) {
      console.error("Error sending friend request:", err);
      alert("Failed to send request. Check console.");
    }
  };

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
      console.error(err);
    }
  };

  const saveChanges = async () => {
    setEditError(null);

    if (tempProfile.username !== userProfile?.username) {
      if (tempProfile.username.length < 3) {
        setEditError("Username must be at least 3 characters long.");
        return;
      }

      const isUnique = await isUsernameUnique(tempProfile.username);
      if (!isUnique) {
        setEditError("This username is already taken.");
        return;
      }
    }

    try {
      const userRef = doc(db, "users", auth.currentUser!.uid);
      await updateDoc(userRef, tempProfile);
      setUserProfile({ ...userProfile!, ...tempProfile });
      setEditing(false);
    } catch (err) {
      console.error(err);
      setEditError("Failed to save changes. Please try again.");
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 300;
      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <p className="text-red-500">{error}</p>
      </div>
    );

  return (
    <main className={`${inter.className} min-h-screen bg-black text-zinc-100 pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden`}>
      <div className="absolute top-0 left-0 w-full h-[500px] bg-violet-900/10 blur-[100px] pointer-events-none" />
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-xl">
            {/* Profile Picture Logic */}
            <div className="relative group shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={auth.currentUser?.uid !== profileUid}
              />
              <div
                className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-zinc-700 relative ${auth.currentUser?.uid === profileUid ? "cursor-pointer" : ""}`}
                onClick={() => auth.currentUser?.uid === profileUid && fileInputRef.current?.click()}
              >
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover group-hover:opacity-50 transition-all duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-violet-900/30 flex items-center justify-center text-violet-400 text-4xl font-bold group-hover:bg-violet-900/50 transition-colors">
                    {userProfile?.displayName?.[0].toUpperCase()}
                  </div>
                )}
                {auth.currentUser?.uid === profileUid && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Pencil className="w-8 h-8 text-white" />
                    </div>
                )}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4 w-full">
              
              {/* --- FRIENDSHIP BUTTONS --- */}
              {auth.currentUser?.uid !== profileUid && (
                <div className="mt-4">
                  {friendshipStatus === "none" && (
                    <button
                      onClick={sendFriendRequest}
                      className="px-4 py-2 bg-violet-600 rounded-full text-white font-semibold hover:bg-violet-500 transition"
                    >
                      Add Friend
                    </button>
                  )}

                  {friendshipStatus === "sent" && (
                    <span className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-400 cursor-default">
                      Request Sent
                    </span>
                  )}

                  {friendshipStatus === "received" && (
                    <span className="px-4 py-2 bg-violet-900/50 border border-violet-500 rounded-full text-violet-200 cursor-default">
                      Has requested you
                    </span>
                    // Note: You can add Accept/Decline buttons here later
                  )}

                  {friendshipStatus === "friends" && (
                    <span className="px-4 py-2 bg-green-900/30 border border-green-600/50 rounded-full text-green-400">
                      Friends
                    </span>
                  )}
                </div>
              )}

              {/* ... (Rest of UI is standard) ... */}
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                    {userProfile?.username || userProfile?.displayName}
                  </h1>
                  <p className="text-zinc-500 text-sm mt-1 font-mono">
                    {userProfile?.email}
                  </p>
                </div>

                {auth.currentUser?.uid === profileUid && (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-violet-500/50 hover:bg-zinc-800 rounded-full text-sm font-medium transition-all duration-300 flex items-center gap-2 group"
                  >
                    <Pencil className="w-3 h-3 group-hover:text-violet-400" />
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
                <p className="text-zinc-300 leading-relaxed italic">
                  {userProfile?.bio || "Add a biography!"}
                </p>
              </div>

              {/* ... (Stats/Location/School pills) ... */}
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {userProfile?.location && (
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                    <MapPin className="w-3 h-3 text-violet-400" />
                    {userProfile.location}
                  </div>
                )}
                {userProfile?.school && (
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                    <School className="w-3 h-3 text-violet-400" />
                    {userProfile.school}
                  </div>
                )}
                {userProfile?.grade && (
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                    <GraduationCap className="w-3 h-3 text-violet-400" />
                    {userProfile.grade}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800">
                  <Calendar className="w-3 h-3 text-violet-400" />
                  Joined{" "}
                  {userProfile?.createdAt
                    ? new Date(
                        userProfile.createdAt.seconds * 1000
                      ).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })
                    : "Unknown"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 flex flex-col justify-center items-center shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col items-center">
              <h3>Ranked ELO</h3>
              <span className="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 tracking-tighter">
                {Math.round(userProfile?.bElo || 0)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* ... (Recent Sets section remains the same) ... */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-violet-500" />
              Recent Sets
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => scroll("left")}
                className="p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {setsPlayed.length === 0 ? (
              <div className="w-full p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500">
                No recent activity recorded.
              </div>
            ) : (
              setsPlayed.map((set, i) => (
                <div
                  key={i}
                  className="min-w-[240px] bg-zinc-900/50 border border-zinc-800/50 p-5 rounded-2xl hover:border-violet-500/30 transition-all group"
                >
                  <div className="flex flex-col h-full justify-between gap-4">
                    <span className="text-zinc-300 font-medium line-clamp-2 text-sm group-hover:text-white transition-colors">
                      {set.name.replace("Name: ", "")}
                    </span>
                    <div className="flex items-end justify-between border-t border-zinc-800 pt-3">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider">
                        Score
                      </span>
                      <span className="text-xl font-bold text-violet-400">
                        {set.score}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        <div className="text-center pt-8 border-t border-zinc-900">
          <Link
            href="/home"
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
      
      {/* ... (Editing Modal remains the same) ... */}
      {editing && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl relative"
          >
            <button
              onClick={() => setEditing(false)}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-zinc-900 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-center">
              Update Profile
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block ml-1">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={tempProfile.username}
                      onChange={(e) =>
                        setTempProfile({
                          ...tempProfile,
                          username: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-violet-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                    />
                  </div>
                </div>
                {/* ... Rest of inputs ... */}
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block ml-1">
                    Display Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      value={tempProfile.displayName}
                      onChange={(e) =>
                        setTempProfile({
                          ...tempProfile,
                          displayName: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-violet-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block ml-1">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Brief description..."
                    value={tempProfile.bio}
                    onChange={(e) =>
                      setTempProfile({ ...tempProfile, bio: e.target.value })
                    }
                    className="w-full bg-zinc-900 text-white p-3 rounded-xl border border-zinc-800 focus:border-violet-500 focus:outline-none transition-colors placeholder:text-zinc-600 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block ml-1">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="City, Country"
                      value={tempProfile.location}
                      onChange={(e) =>
                        setTempProfile({
                          ...tempProfile,
                          location: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-violet-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block ml-1">
                    Grade
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Year 12"
                      value={tempProfile.grade}
                      onChange={(e) =>
                        setTempProfile({
                          ...tempProfile,
                          grade: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-violet-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block ml-1">
                    School / Institution
                  </label>
                  <div className="relative">
                    <School className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="University or High School Name"
                      value={tempProfile.school}
                      onChange={(e) =>
                        setTempProfile({
                          ...tempProfile,
                          school: e.target.value,
                        })
                      }
                      className="w-full bg-zinc-900 text-white p-2.5 pl-10 rounded-xl border border-zinc-800 focus:border-violet-500 focus:outline-none transition-colors placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </div>
              {editError && (
                <p className="text-red-500 text-sm mt-4">{editError}</p>
              )}
              <div className="flex gap-3 mt-8 pt-4 border-t border-zinc-900">
                <button
                  onClick={saveChanges}
                  className="flex-1 bg-violet-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-violet-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}