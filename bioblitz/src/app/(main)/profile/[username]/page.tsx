"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getAuth } from "firebase/auth";
import { doc, getFirestore, updateDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Inter } from "next/font/google";
import { uploadImage } from "@/lib/storage";
import { isUsernameUnique } from "@/lib/user";
import Link from "next/link";
import SetsPlayedGrid from "@/components/profile/SetsPlayedGrid";
import ProfileHeroCard from "@/components/profile/ProfileHeroCard";
import EditProfileModal from "@/components/profile/EditProfileModal";
import ReportModal from "@/components/profile/ReportModal";
import { EloChart } from "@/components/profile";
import { useProfileData } from "@/hooks/profile/useProfileData";
import { useFriendActions, SearchUser } from "@/hooks/profile/useFriendActions";
import { useProfileReport } from "@/hooks/profile/useProfileReport";
import { UserProfile } from "@/hooks/profile/types";
import { useAuth } from "@/context/AuthContext";
import { applyUsernamePolicy } from "@/lib/usernamePolicy";
import { applyTextPolicy } from "@/lib/textPolicy";
import ImageUploadZone from "@/components/ui/ImageUploadZone";

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

  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();
  const { updateUsername, loading: authLoading, user: authUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"rating" | "friends" | "sets">(
    "rating",
  );
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [tempProfile, setTempProfile] = useState({
    bio: "",
    username: "",
  });

  const {
    profileUid,
    userProfile,
    setUserProfile,
    setsPlayed,
    eloHistory,
    loading,
    loadingSets,
    loadingElo,
    error,
  } = useProfileData({
    db,
    usernameParamRaw,
    usernameParamNormalized,
    authLoading,
  });

  const {
    friendshipStatus,
    friends,
    incomingRequests,
    friendUsernameInput,
    setFriendUsernameInput,
    loadingFriends,
    userSearchResults,
    isSearching,
    addFriendSuccess,
    addFriendByUid,
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
        username: userProfile.username || "",
      });
    }
  }, [userProfile]);

  const handleFileDirect = async (file: File) => {
    if (!userProfile || !auth.currentUser) return;
    try {
      const profileRef = storageRef(
        storage,
        `profilePictures/${auth.currentUser.uid}`,
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userProfile || !auth.currentUser) return;
    const file = e.target.files[0];
    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `profilePictures/${auth.currentUser.uid}/${Date.now()}.${extension}`;
      const downloadURL = await uploadImage(file, path);
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
      tempProfile.username,
    );
    if (censored) {
      setEditError("Inappropriate username, try again.");
      return;
    }

    const { value: censoredBio } = await applyTextPolicy(tempProfile.bio || "");

    if (
      cleanedUsername !== (userProfile?.username || "").trim().toLowerCase()
    ) {
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
        bio: censoredBio,
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

  if (authLoading || loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-900 gap-4">
        <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin" />
        <span className="text-neutral-400 text-sm font-medium">Loading...</span>
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
      className={`${inter.className} min-h-screen bg-neutral-900 text-neutral-100 pt-24 pb-12 pl-4 md:pl-16 pr-4 sm:pr-6 lg:pr-8 relative overflow-hidden`}
    >
      <div className="absolute top-0 left-0 w-full h-125 bg-neutral-900/10 blur-[100px] pointer-events-none" />
      <div className="max-w-6xl mx-auto space-y-4 md:space-y-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6"
        >
          <ImageUploadZone
            onFile={authUser?.uid === profileUid ? handleFileDirect : () => {}}
          >
            <ProfileHeroCard
              userProfile={userProfile}
              isOwnProfile={authUser?.uid === profileUid}
              isAuthenticated={!!authUser}
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
          </ImageUploadZone>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-950/50 backdrop-blur-sm border border-neutral-800 rounded-3xl shadow-xl overflow-hidden"
        >
          {/* Tab bar */}
          <div className="flex items-center gap-0.5 p-[3px] border-b border-neutral-800 px-3 pt-3">
            {(["rating", "friends", "sets"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all ${
                  activeTab === tab
                    ? "bg-neutral-800 text-white shadow-sm shadow-white/5"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {tab === "rating"
                  ? "Rating Graph"
                  : tab === "friends"
                    ? "Friends"
                    : "Blitzes Completed"}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-4 md:p-6">
            {activeTab === "rating" &&
              (loadingElo ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 w-32 bg-neutral-800 rounded-full" />
                  <div className="h-48 w-full bg-neutral-800/60 rounded-2xl" />
                  <div className="flex gap-2 justify-end">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-3 w-10 bg-neutral-800 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <EloChart eloHistory={eloHistory} />
              ))}

            {activeTab === "friends" && (
              <div className="flex gap-6 min-h-80">
                {/* Left: friends list */}
                <div className="w-1/2 flex flex-col gap-3">
                  <p className="text-xs font-semibold text-neutral-400">
                    {friends.length}{" "}
                    {friends.length === 1 ? "friend" : "friends"}
                  </p>
                  <div className="flex-1 overflow-y-auto space-y-1 [scrollbar-width:thin] [scrollbar-color:#52525b_transparent]">
                    {loadingFriends ? (
                      <div className="flex items-center gap-2 text-neutral-500 py-4">
                        <div className="w-4 h-4 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Loading…</span>
                      </div>
                    ) : friends.length === 0 ? (
                      <p className="text-neutral-500 text-sm py-4">
                        No friends yet.
                      </p>
                    ) : (
                      friends.map((friend) => (
                        <Link
                          key={friend.uid}
                          href={profilePathFor(friend)}
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-neutral-800/70 transition"
                        >
                          {friend.photoURL ? (
                            <img
                              src={friend.photoURL}
                              alt={friend.displayName}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  "/images/logo.svg";
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-300 shrink-0">
                              {friend.displayName?.[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {friend.username || friend.displayName}
                            </p>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-neutral-800 shrink-0" />

                {/* Right: add friend + requests */}
                <div className="w-1/2 flex flex-col gap-5">
                  {authUser?.uid === profileUid && (
                    <>
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-semibold text-neutral-400">
                          Add friend
                        </p>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search by username…"
                            value={friendUsernameInput}
                            onChange={(e) =>
                              setFriendUsernameInput(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                setFriendUsernameInput("");
                              }
                            }}
                            className="w-full bg-neutral-900 text-white text-sm p-2.5 rounded-xl border border-neutral-700 focus:border-neutral-500 focus:outline-none placeholder:text-neutral-600 transition-colors"
                          />
                          {isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin" />
                          )}
                          {friendUsernameInput.trim() &&
                            !isSearching &&
                            userSearchResults.length === 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 shadow-lg">
                                <p className="text-neutral-500 text-xs">
                                  No users found
                                </p>
                              </div>
                            )}
                          {userSearchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
                              {userSearchResults.map((u: SearchUser) => (
                                <button
                                  key={u.uid}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => addFriendByUid(u)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-neutral-800 transition-colors text-left"
                                >
                                  {u.photoURL ? (
                                    <img
                                      src={u.photoURL}
                                      alt={u.displayName}
                                      className="w-7 h-7 rounded-full object-cover shrink-0"
                                      onError={(e) => {
                                        (
                                          e.currentTarget as HTMLImageElement
                                        ).src = "/images/logo.svg";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-300 shrink-0">
                                      {u.displayName?.[0]?.toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                      {u.username || u.displayName}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {addFriendSuccess && (
                          <p className="text-xs text-neutral-400">
                            {addFriendSuccess}
                          </p>
                        )}
                      </div>

                      {incomingRequests.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-semibold text-neutral-400">
                            Requests ({incomingRequests.length})
                          </p>
                          <div className="space-y-1.5 overflow-y-auto max-h-48 [scrollbar-width:thin] [scrollbar-color:#52525b_transparent]">
                            {incomingRequests.map((req) => (
                              <div
                                key={req.uid}
                                className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-neutral-800/50"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {req.photoURL ? (
                                    <img
                                      src={req.photoURL}
                                      alt={req.displayName}
                                      className="w-7 h-7 rounded-full object-cover shrink-0"
                                      onError={(e) => {
                                        (
                                          e.currentTarget as HTMLImageElement
                                        ).src = "/images/logo.svg";
                                      }}
                                    />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-300 shrink-0">
                                      {req.displayName?.[0]}
                                    </div>
                                  )}
                                  <span className="text-sm text-white truncate">
                                    {req.username || req.displayName}
                                  </span>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    onClick={() =>
                                      handleAcceptIncomingRequest(req)
                                    }
                                    className="px-2.5 py-1 bg-green-600 hover:bg-green-500 rounded-full text-white text-xs font-medium transition"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeclineIncomingRequest(req)
                                    }
                                    className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 rounded-full text-neutral-400 text-xs font-medium transition"
                                  >
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
                  {authUser?.uid !== profileUid && (
                    <p className="text-neutral-500 text-sm pt-4">
                      Only visible to the profile owner.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "sets" &&
              (loadingSets ? (
                <div className="space-y-4 animate-pulse">
                  <div className="flex items-center justify-between px-2">
                    <div className="h-4 w-36 bg-neutral-800 rounded-full" />
                    <div className="h-3 w-12 bg-neutral-800 rounded-full" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[...Array(30)].map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-lg bg-neutral-800"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <SetsPlayedGrid setsPlayed={setsPlayed} />
              ))}
          </div>
        </motion.div>

        <Link
          href={userProfile ? channelPathFor(userProfile) : "/channel"}
          className="group block rounded-2xl sm:rounded-3xl border border-neutral-800 bg-neutral-950/70 overflow-hidden shadow-xl"
        >
          <div
            className="relative h-24 sm:h-48 bg-neutral-900/60 flex items-center justify-center overflow-hidden"
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
                />
                <div className="absolute inset-0 bg-neutral-900/60" />
                <div className="relative h-full flex items-center justify-center">
                  <img
                    src={userProfile.photoURL}
                    alt="Channel owner"
                    className="w-20 h-20 rounded-full object-cover border-2 border-neutral-700"
                  />
                </div>
              </>
            )}
            {!userProfile?.bannerURL && !userProfile?.photoURL && (
              <div className="absolute inset-0 bg-gradient-to-b from-neutral-900 to-black" />
            )}
          </div>
          <div className="px-4 py-3 sm:px-6 sm:py-5  flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Channel
              </p>
              <h3 className="text-sm sm:text-xl font-semibold text-white">
                {userProfile?.channelName ||
                  userProfile?.displayName ||
                  "Channel"}
              </h3>
              <p className="text-sm text-neutral-400">
                @{userProfile?.username || "user"}
              </p>
            </div>
            <span className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-neutral-500/30 text-neutral-300 text-xs sm:text-sm font-medium group-hover:bg-neutral-500/10 transition">
              Visit Channel
            </span>
          </div>
        </Link>

        <div className="text-center pt-8 border-t border-neutral-900">
          <Link
            href="/home"
            className="text-neutral-500 hover:text-white text-sm transition-colors"
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
