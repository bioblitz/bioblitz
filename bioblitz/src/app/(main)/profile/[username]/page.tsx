"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getAuth } from "firebase/auth";
import {
  doc,
  getFirestore,
  updateDoc,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
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
import RecentSetsCarousel from "@/components/profile/RecentSetsCarousel";
import ProfileHeroCard from "@/components/profile/ProfileHeroCard";
import EditProfileModal from "@/components/profile/EditProfileModal";
import ReportModal from "@/components/profile/ReportModal";
import { EloChart } from "@/components/profile";
import { useProfileData } from "@/hooks/profile/useProfileData";
import { useFriendActions } from "@/hooks/profile/useFriendActions";
import { useProfileReport } from "@/hooks/profile/useProfileReport";
import { UserProfile } from "@/hooks/profile/types";
import { useAuth } from "@/context/AuthContext";
import { applyUsernamePolicy } from "@/lib/usernamePolicy";
import { applyTextPolicy } from "@/lib/textPolicy";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export default function ProfilePage() {
  const params = useParams();

  const usernameParamRaw = useMemo(() => {
    const raw = (params as any)?.username;
    const segment = Array.isArray(raw) ? raw[0] : raw;
    if (!segment) return "";
    try {
      return decodeURIComponent(String(segment)).trim();
    } catch {
      return String(segment).trim();
    }
  }, [params]);

  const usernameParamNormalized = useMemo(() => {
    return usernameParamRaw.trim().toLowerCase();
  }, [usernameParamRaw]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const router = useRouter();
  const { updateUsername } = useAuth();

  const [activeTab, setActiveTab] = useState<"rating" | "friends" | "sets">("rating");
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

  const {
    profileUid,
    userProfile,
    setUserProfile,
    setsPlayed,
    eloHistory,
    loading,
    error,
  } = useProfileData({ db, usernameParamRaw, usernameParamNormalized });

  const {
    friendshipStatus,
    friends,
    incomingRequests,
    friendUsernameInput,
    setFriendUsernameInput,
    loadingFriends,
    addFriendByUsername,
    removeFriend,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    handleAcceptIncomingRequest,
    handleDeclineIncomingRequest,
  } = useFriendActions({ auth, db, profileUid, userProfile });

  const {
    reporting,
    setReporting,
    reportCategory,
    setReportCategory,
    reportDescription,
    setReportDescription,
    isSubmittingReport,
    reportSuccess,
    REPORT_CATEGORIES,
    handleReportSubmit,
  } = useProfileReport({
    reportedUser: userProfile?.username || "Unknown",
    reporterUser: auth.currentUser?.displayName || "Anonymous",
  });

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

    const { value: cleanedUsername, censored } = await applyUsernamePolicy(
      tempProfile.username
    );
    if (censored) {
      setEditError("Inappropriate username, try again.");
      return;
    }

    const { value: censoredBio } = await applyTextPolicy(tempProfile.bio || "");
    const { value: censoredLocation } = await applyTextPolicy(
      tempProfile.location || ""
    );
    const { value: censoredSchool } = await applyTextPolicy(tempProfile.school || "");
    const { value: censoredDisplayName } = await applyTextPolicy(
      tempProfile.displayName || ""
    );

    if (cleanedUsername !== (userProfile?.username || "").trim().toLowerCase()) {
      if (cleanedUsername.length < 3) {
        setEditError("Username must be at least 3 characters long.");
        return;
      }
      const isUnique = await isUsernameUnique(cleanedUsername);
      if (!isUnique) {
        setEditError("This username is already taken.");
        return;
      }
    }

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);

      const payload = {
        ...tempProfile,
        bio: censoredBio,
        location: censoredLocation,
        school: censoredSchool,
        displayName: censoredDisplayName,
        username: cleanedUsername,
      };

      await updateDoc(userRef, payload);
      setUserProfile({ ...userProfile!, ...payload });
      updateUsername(cleanedUsername);

      if (cleanedUsername && cleanedUsername !== usernameParamNormalized) {
        router.push(`/profile/${cleanedUsername}`);
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

  const profilePathFor = (u: Pick<UserProfile, "uid" | "username">) => {
    const uname = (u.username || "").trim();
    if (uname) return `/profile/${uname.toLowerCase()}`;
    return `/profile/${u.uid}`;
  };

  const channelPathFor = (u: Pick<UserProfile, "uid" | "username">) => {
    const uname = (u.username || "").trim();
    if (uname) return `/channel/${uname.toLowerCase()}`;
    return `/channel/${u.uid}`;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <div className="w-6 h-6 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-screen bg-neutral-900 text-white">
        <p className="text-red-500">{error}</p>
      </div>
    );

  return (
    <main
      className={`${inter.className} min-h-screen bg-neutral-900 text-zinc-100 pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden`}
    >
      <div className="absolute top-0 left-0 w-full h-125 bg-neutral-900/10 blur-[100px] pointer-events-none" />
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6"
        >
          <ProfileHeroCard
            userProfile={userProfile}
            isOwnProfile={auth.currentUser?.uid === profileUid}
            isAuthenticated={!!auth.currentUser}
            friendshipStatus={friendshipStatus}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onOpenAuth={() => router.push("/auth")}
            onSendFriendRequest={sendFriendRequest}
            onAcceptFriendRequest={acceptFriendRequest}
            onDeclineFriendRequest={declineFriendRequest}
            onRemoveFriend={removeFriend}
            onEditProfile={() => setEditing(true)}
            onOpenReport={() => setReporting(true)}
          />

        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Tab bar */}
          <div className="flex border-b border-zinc-800 px-6 pt-5 gap-6">
            {(["rating", "friends", "sets"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? "border-violet-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab === "rating" ? "Rating Graph" : tab === "friends" ? "Friends" : "Sets Played"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {activeTab === "rating" && (
              <EloChart eloHistory={eloHistory} />
            )}

            {activeTab === "friends" && (
              <div className="flex gap-6 min-h-80">
                {/* Left: friends list */}
                <div className="w-1/2 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    {friends.length} {friends.length === 1 ? "Friend" : "Friends"}
                  </p>
                  <div className="flex-1 overflow-y-auto space-y-1 [scrollbar-width:thin] [scrollbar-color:#52525b_transparent]">
                    {loadingFriends ? (
                      <div className="flex items-center gap-2 text-zinc-500 py-4">
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading…</span>
                      </div>
                    ) : friends.length === 0 ? (
                      <p className="text-zinc-500 text-sm py-4">No friends yet.</p>
                    ) : (
                      friends.map((friend) => (
                        <Link
                          key={friend.uid}
                          href={profilePathFor(friend)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-800/70 transition"
                        >
                          {friend.photoURL ? (
                            <img
                              src={friend.photoURL}
                              alt={friend.displayName}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/logo.svg"; }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                              {friend.displayName?.[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">{friend.displayName}</p>
                            {friend.username && <p className="text-xs text-zinc-500 truncate">@{friend.username}</p>}
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-zinc-800 shrink-0" />

                {/* Right: add friend + requests */}
                <div className="w-1/2 flex flex-col gap-5">
                  {auth.currentUser?.uid === profileUid && (
                    <>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Add Friend</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter username…"
                            value={friendUsernameInput}
                            onChange={(e) => setFriendUsernameInput(e.target.value)}
                            className="flex-1 bg-indigo-500/10 text-white text-sm p-2.5 rounded-xl border border-indigo-500/30 focus:border-indigo-500 focus:outline-none placeholder:text-indigo-200/40 transition-colors"
                          />
                          <button
                            onClick={addFriendByUsername}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-xl font-semibold transition-colors shrink-0"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {incomingRequests.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Requests ({incomingRequests.length})
                          </p>
                          <div className="space-y-1.5 overflow-y-auto max-h-48 [scrollbar-width:thin] [scrollbar-color:#52525b_transparent]">
                            {incomingRequests.map((req) => (
                              <div key={req.uid} className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-zinc-800/50">
                                <div className="flex items-center gap-2 min-w-0">
                                  {req.photoURL ? (
                                    <img src={req.photoURL} alt={req.displayName} className="w-7 h-7 rounded-full object-cover shrink-0"
                                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/images/logo.svg"; }} />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300 shrink-0">
                                      {req.displayName?.[0]}
                                    </div>
                                  )}
                                  <span className="text-sm text-white truncate">{req.displayName}</span>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <button onClick={() => handleAcceptIncomingRequest(req)}
                                    className="px-2.5 py-1 bg-green-600 hover:bg-green-500 rounded-full text-white text-xs font-medium transition">
                                    Accept
                                  </button>
                                  <button onClick={() => handleDeclineIncomingRequest(req)}
                                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 text-xs font-medium transition">
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {auth.currentUser?.uid !== profileUid && (
                    <p className="text-zinc-500 text-sm pt-4">Only visible to the profile owner.</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "sets" && (
              <RecentSetsCarousel
                setsPlayed={setsPlayed}
                scrollRef={scrollRef}
                onScrollLeft={() => scroll("left")}
                onScrollRight={() => scroll("right")}
              />
            )}
          </div>
        </motion.div>

        <Link
          href={userProfile ? channelPathFor(userProfile) : "/channel"}
          className="group block rounded-3xl border border-zinc-800 bg-zinc-950/70 overflow-hidden shadow-xl"
        >
          <div
            className="relative h-40 sm:h-48 bg-zinc-900/60 flex items-center justify-center overflow-hidden"
            style={
              userProfile?.bannerURL
                ? {
                    backgroundImage: `url(${userProfile.bannerURL})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {!userProfile?.bannerURL && userProfile?.photoURL && (
              <>
                <img
                  src={userProfile.photoURL}
                  className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                  alt=""
                  aria-hidden
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-neutral-900/60" />
                <div className="relative h-full flex items-center justify-center">
                  <img
                    src={userProfile.photoURL}
                    alt="Channel owner"
                    className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </>
            )}
            {!userProfile?.bannerURL && !userProfile?.photoURL && (
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />
            )}
          </div>
          <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Channel
              </p>
              <h3 className="text-lg sm:text-xl font-semibold text-white">
                {userProfile?.channelName || userProfile?.displayName || "Channel"}
              </h3>
              <p className="text-sm text-zinc-400">
                @{userProfile?.username || "user"}
              </p>
            </div>
            <span className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-neutral-500/30 text-neutral-300 text-sm font-medium group-hover:bg-neutral-500/10 transition">
              Visit Channel
            </span>
          </div>
        </Link>

        <div className="text-center pt-8 border-t border-zinc-900">
          <Link
            href="/home"
            className="text-zinc-500 hover:text-white text-sm transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      <EditProfileModal
        isOpen={editing}
        tempProfile={tempProfile}
        editError={editError}
        onClose={() => setEditing(false)}
        onSave={saveChanges}
        onChange={(field, value) =>
          setTempProfile((prev) => ({ ...prev, [field]: value }))
        }
      />

      <ReportModal
        isOpen={reporting}
        reportCategory={reportCategory}
        reportDescription={reportDescription}
        isSubmitting={isSubmittingReport}
        success={reportSuccess}
        categories={REPORT_CATEGORIES}
        onClose={() => setReporting(false)}
        onCategoryChange={setReportCategory}
        onDescriptionChange={setReportDescription}
        onSubmit={handleReportSubmit}
      />
    </main>
  );
}