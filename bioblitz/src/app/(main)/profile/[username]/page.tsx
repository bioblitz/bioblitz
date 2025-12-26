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
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
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
  TrendingUp,
  TrendingDown,
  Info,
  Loader2,
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
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";

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

interface EloHistoryPoint {
  date: string;
  elo: number;
  fullDate: string;
}

export default function ProfilePage() {
  const params = useParams();
  const usernameParam = decodeURIComponent(params.username as string);
  const [profileUid, setProfileUid] = useState<string | null>(null);

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
  const [eloHistory, setEloHistory] = useState<EloHistoryPoint[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const router = useRouter();

  const [friendshipStatus, setFriendshipStatus] = useState<
    "none" | "sent" | "received" | "friends"
  >("none");
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<UserProfile[]>([]);
  const [friendUsernameInput, setFriendUsernameInput] = useState("");

  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    const fetchUserByUsername = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "users"),
          where("username", "==", usernameParam)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError("User not found.");
          setLoading(false);
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data() as UserProfile;

        setProfileUid(userDoc.id);
        setUserProfile({ ...userData, uid: userDoc.id });
      } catch (err) {
        console.error(err);
        setError("Unable to load profile.");
      } finally {
        setLoading(false);
      }
    };

    if (usernameParam) {
      fetchUserByUsername();
    }
  }, [usernameParam, db]);

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
    if (!profileUid) return;

    const fetchSetsPlayed = async () => {
      try {
        const setsRef = collection(db, "users", profileUid, "setsPlayed");
        const setsSnap = await getDocs(setsRef);

        const sortedDocs = setsSnap.docs.sort((a, b) => {
          const dataA = a.data();
          const dataB = b.data();
          const timeA =
            dataA.lastPlayedAt?.toMillis() || dataA.playedAt?.toMillis() || 0;
          const timeB =
            dataB.lastPlayedAt?.toMillis() || dataB.playedAt?.toMillis() || 0;
          return timeB - timeA;
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
  }, [profileUid, db]);

  useEffect(() => {
    if (!profileUid || !userProfile) return;

    const fetchHistory = async () => {
      try {
        const historyRef = collection(db, "users", profileUid, "ratingHistory");
        const q = query(historyRef, orderBy("timestamp", "asc"), limit(20));
        const snap = await getDocs(q);

        const historyData: EloHistoryPoint[] = snap.docs.map((doc) => {
          const data = doc.data();
          const date = data.timestamp
            ? new Date(data.timestamp.seconds * 1000)
            : new Date();
          return {
            elo: data.newElo,
            date: date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }),
            fullDate: date.toLocaleDateString(),
          };
        });

        if (historyData.length === 0 && userProfile.bElo) {
          historyData.push({
            elo: userProfile.bElo,
            date: "Now",
            fullDate: new Date().toLocaleDateString(),
          });
          historyData.unshift({
            elo: 1200,
            date: "Joined",
            fullDate: "Start",
          });
        }

        setEloHistory(historyData);
      } catch (err) {
        console.error(err);
      }
    };

    fetchHistory();
  }, [profileUid, userProfile, db]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!profileUid || !currentUser || currentUser.uid === profileUid) return;

    const checkFriendship = async () => {
      try {
        const myFriendDocRef = doc(
          db,
          "users",
          currentUser.uid,
          "friends",
          profileUid
        );
        const docSnap = await getDoc(myFriendDocRef);

        if (docSnap.exists()) {
          setFriendshipStatus(docSnap.data().status);
        } else {
          setFriendshipStatus("none");
        }
      } catch (err) {
        console.error(err);
      }
    };

    checkFriendship();
  }, [profileUid, auth.currentUser, db]);

  // Fetch Friends & Requests
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser || !profileUid) return;

    const fetchFriendsAndRequests = async () => {
      setLoadingFriends(true); // Start loading
      try {
        // --- A. Fetch Friends ---
        const friendsQuery = query(
          collection(db, "users", profileUid, "friends"),
          where("status", "==", "friends")
        );
        const friendsSnap = await getDocs(friendsQuery);

        const friendsData = await Promise.all(
          friendsSnap.docs.map(async (friendDoc) => {
            const uid = friendDoc.data().uid;
            if (!uid) return null;
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
              const data = userSnap.data() as UserProfile;
              return { ...data, uid: userSnap.id };
            }
            return null;
          })
        );
        setFriends(friendsData.filter((u): u is UserProfile => u !== null));

        if (currentUser.uid === profileUid) {
          const requestsQuery = query(
            collection(db, "users", currentUser.uid, "friends"),
            where("status", "==", "received")
          );
          const requestsSnap = await getDocs(requestsQuery);

          const requestsData = await Promise.all(
            requestsSnap.docs.map(async (reqDoc) => {
              const uid = reqDoc.data().uid;
              if (!uid) return null;
              const userSnap = await getDoc(doc(db, "users", uid));
              if (userSnap.exists()) {
                const data = userSnap.data() as UserProfile;
                return { ...data, uid: userSnap.id };
              }
              return null;
            })
          );
          setIncomingRequests(
            requestsData.filter((u): u is UserProfile => u !== null)
          );
        }
      } catch (err) {
        console.error("Error fetching friends/requests:", err);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriendsAndRequests();
  }, [auth.currentUser, db, profileUid]);

  const addFriendByUsername = async () => {
    if (!auth.currentUser || !friendUsernameInput) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", friendUsernameInput));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("User not found!");
        return;
      }

      const targetUserDoc = querySnapshot.docs[0];
      const targetUid = targetUserDoc.id;
      const targetUserData = targetUserDoc.data();

      if (targetUid === auth.currentUser.uid) {
        alert("You cannot add yourself!");
        return;
      }

      const myFriendDocRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "friends",
        targetUid
      );
      const myFriendSnap = await getDoc(myFriendDocRef);

      if (myFriendSnap.exists()) {
        const status = myFriendSnap.data().status;
        if (status === "friends") {
          alert("Already friends.");
          return;
        }
        if (status === "sent") {
          alert("Request already sent.");
          return;
        }
        if (status === "received") {
          alert("They already sent you a request.");
          return;
        }
      }

      const batch = writeBatch(db);

      const myRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "friends",
        targetUid
      );
      batch.set(myRef, {
        uid: targetUid,
        status: "sent",
        createdAt: Timestamp.now(),
        displayName: targetUserData.displayName || "",
        photoURL: targetUserData.photoURL || "",
      });

      const theirRef = doc(
        db,
        "users",
        targetUid,
        "friends",
        auth.currentUser.uid
      );
      batch.set(theirRef, {
        uid: auth.currentUser.uid,
        status: "received",
        createdAt: Timestamp.now(),
        displayName: auth.currentUser.displayName || "Unknown",
        photoURL: auth.currentUser.photoURL || "",
      });

      await batch.commit();
      alert(`Friend request sent to ${targetUserData.username}!`);
      setFriendUsernameInput("");
    } catch (err) {
      console.error(err);
      alert("Error adding friend.");
    }
  };

  const sendFriendRequest = async () => {
    if (!auth.currentUser || !userProfile || !profileUid) return;

    try {
      const batch = writeBatch(db);

      const myRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "friends",
        profileUid
      );
      batch.set(myRef, {
        uid: profileUid,
        status: "sent",
        createdAt: Timestamp.now(),
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
      });

      const theirRef = doc(
        db,
        "users",
        profileUid,
        "friends",
        auth.currentUser.uid
      );
      batch.set(theirRef, {
        uid: auth.currentUser.uid,
        status: "received",
        createdAt: Timestamp.now(),
        displayName: auth.currentUser.displayName || "Unknown",
        photoURL: auth.currentUser.photoURL || "",
      });

      await batch.commit();
      setFriendshipStatus("sent");
    } catch (err) {
      console.error(err);
      alert("Failed to send request.");
    }
  };

  const acceptFriendRequest = async () => {
    if (!auth.currentUser || !profileUid) return;
    try {
      const batch = writeBatch(db);
      const myRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "friends",
        profileUid
      );
      const theirRef = doc(
        db,
        "users",
        profileUid,
        "friends",
        auth.currentUser.uid
      );
      batch.update(myRef, { status: "friends" });
      batch.update(theirRef, { status: "friends" });
      await batch.commit();
      setFriendshipStatus("friends");
    } catch (err) {
      console.error(err);
    }
  };

  const declineFriendRequest = async () => {
    if (!auth.currentUser || !profileUid) return;
    try {
      const batch = writeBatch(db);
      const myRef = doc(
        db,
        "users",
        auth.currentUser.uid,
        "friends",
        profileUid
      );
      const theirRef = doc(
        db,
        "users",
        profileUid,
        "friends",
        auth.currentUser.uid
      );
      batch.delete(myRef);
      batch.delete(theirRef);
      await batch.commit();
      setFriendshipStatus("none");
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userProfile || !auth.currentUser) return;
    const file = e.target.files[0];
    try {
      const profileRef = storageRef(
        storage,
        `profilePictures/${auth.currentUser.uid}`
      );
      await uploadBytes(profileRef, file);
      const downloadURL = await getDownloadURL(profileRef);
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        photoURL: downloadURL,
      });
      setUserProfile({ ...userProfile, photoURL: downloadURL });
    } catch (err) {
      console.error(err);
    }
  };

  const saveChanges = async () => {
    setEditError(null);
    if (!auth.currentUser) return;

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
      const userRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userRef, tempProfile);
      setUserProfile({ ...userProfile!, ...tempProfile });

      if (tempProfile.username !== usernameParam) {
        router.push(`/profile/${tempProfile.username}`);
      }

      setEditing(false);
    } catch (err) {
      console.error(err);
      setEditError("Failed to save changes.");
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

  const isTrendingUp =
    eloHistory.length >= 2 &&
    eloHistory[eloHistory.length - 1].elo >=
      eloHistory[eloHistory.length - 2].elo;

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
    <main
      className={`${inter.className} min-h-screen bg-black text-zinc-100 pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden`}
    >
      <div className="absolute top-0 left-0 w-full h-125 bg-violet-900/10 blur-[100px] pointer-events-none" />
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-3 gap-6"
        >
          <div className="lg:col-span-2 bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-xl">
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
                className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-zinc-700 relative ${
                  auth.currentUser?.uid === profileUid ? "cursor-pointer" : ""
                }`}
                onClick={() =>
                  auth.currentUser?.uid === profileUid &&
                  fileInputRef.current?.click()
                }
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
                    <div className="flex gap-2">
                      <button
                        onClick={acceptFriendRequest}
                        className="px-4 py-2 bg-green-600 rounded-full text-white font-semibold hover:bg-green-500 transition"
                      >
                        Accept
                      </button>
                      <button
                        onClick={declineFriendRequest}
                        className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-400 hover:text-white transition"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {friendshipStatus === "friends" && (
                    <span className="px-4 py-2 bg-green-900/30 border border-green-600/50 rounded-full text-green-400">
                      Friends
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                    {userProfile?.displayName || userProfile?.username}{" "}
                  </h1>
                  {auth.currentUser?.uid === profileUid && (
                    <p className="text-zinc-500 text-sm mt-1 font-mono">
                      {userProfile?.email}
                    </p>
                  )}
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

          <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl flex flex-col shadow-xl relative overflow-hidden h-full min-h-75">
            <div className="absolute inset-0 bg-linear-to-br from-violet-500/5 to-transparent opacity-50 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center pt-8 pb-4">
              <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1">
                Ranked Rating
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-6xl font-bold bg-clip-text text-transparent bg-linear-to-b from-white to-zinc-400 tracking-tighter">
                  {Math.round(userProfile?.bElo || 0)}
                </span>
                {eloHistory.length > 1 && (
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      isTrendingUp
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {isTrendingUp ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full h-45 mt-auto">
              {eloHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={eloHistory}
                    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorElo" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "#a1a1aa" }}
                      labelStyle={{
                        color: "#fff",
                        fontWeight: "bold",
                        marginBottom: "4px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="elo"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorElo)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-sm pb-8">
                  Play more games to see history
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-2 gap-6"
        >
          <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white ">Friends</h3>
            {loadingFriends ? (
              <div className="flex flex-col items-center justify-center py-6 text-zinc-500 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                <span className="text-sm animate-pulse">
                  Loading friends...
                </span>
              </div>
            ) : friends.length === 0 ? (
              <p className="text-zinc-400 text-sm">No friends yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {friends.map((friend) => (
                  <Link
                    key={friend.uid}
                    href={`/profile/${friend.username || friend.uid}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800 transition"
                  >
                    {friend.photoURL ? (
                      <img
                        src={friend.photoURL}
                        alt={friend.displayName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-violet-900/50 flex items-center justify-center text-xs text-violet-300 font-bold">
                        {friend.displayName?.[0]}
                      </div>
                    )}
                    <span className="text-sm text-white">
                      {friend.displayName}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {auth.currentUser?.uid === profileUid && (
            <div className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-2">
                Friend Requests
              </h3>

              {loadingFriends ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-700" />
                </div>
              ) : incomingRequests.length === 0 ? (
                <p className="text-zinc-400 text-sm">No incoming requests.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {incomingRequests.map((request) => (
                    <div
                      key={request.uid}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-zinc-800 transition"
                    >
                      <div className="flex items-center gap-3">
                        {request.photoURL ? (
                          <img
                            src={request.photoURL}
                            alt={request.displayName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-violet-900/50 flex items-center justify-center text-xs text-violet-300 font-bold">
                            {request.displayName?.[0]}
                          </div>
                        )}
                        <span className="text-sm text-white">
                          {request.displayName}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            const batch = writeBatch(db);
                            const myRef = doc(
                              db,
                              "users",
                              auth.currentUser!.uid,
                              "friends",
                              request.uid
                            );
                            const theirRef = doc(
                              db,
                              "users",
                              request.uid,
                              "friends",
                              auth.currentUser!.uid
                            );
                            batch.update(myRef, { status: "friends" });
                            batch.update(theirRef, { status: "friends" });
                            await batch.commit();

                            setIncomingRequests((prev) =>
                              prev.filter((r) => r.uid !== request.uid)
                            );
                            setFriends((prev) => [...prev, request]);
                          }}
                          className="px-3 py-1 bg-green-600 rounded-full text-white text-sm hover:bg-green-500"
                        >
                          Accept
                        </button>
                        <button
                          onClick={async () => {
                            const batch = writeBatch(db);
                            const myRef = doc(
                              db,
                              "users",
                              auth.currentUser!.uid,
                              "friends",
                              request.uid
                            );
                            const theirRef = doc(
                              db,
                              "users",
                              request.uid,
                              "friends",
                              auth.currentUser!.uid
                            );
                            batch.delete(myRef);
                            batch.delete(theirRef);
                            await batch.commit();

                            setIncomingRequests((prev) =>
                              prev.filter((r) => r.uid !== request.uid)
                            );
                          }}
                          className="px-3 py-1 bg-zinc-800 rounded-full text-zinc-400 text-sm hover:text-white"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-3">
                <div className="flex gap-2 items-center">
                  <div className="relative shrink-0 group">
                    <Info className="w-4 h-4 text-indigo-300 cursor-default" />
                    <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max px-2 py-1 text-xs text-white bg-zinc-900 rounded-md border border-zinc-800 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100">
                      Ask for their Username
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Enter Username to Add"
                    value={friendUsernameInput}
                    onChange={(e) => setFriendUsernameInput(e.target.value)}
                    className="flex-1 bg-indigo-500/10 text-white text-sm p-2.5 rounded-xl border border-indigo-500/30 focus:border-indigo-500 focus:outline-none placeholder:text-indigo-200/50 transition-colors"
                  />
                  <button
                    onClick={addFriendByUsername}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-xl hover:bg-indigo-500 transition-colors font-semibold whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

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
