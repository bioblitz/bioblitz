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
import DomainMasterySection from "@/components/profile/DomainMasterySection";
import RecentSetsCarousel from "@/components/profile/RecentSetsCarousel";
import ProfileHeroCard from "@/components/profile/ProfileHeroCard";
import ProfileFriendsPanel from "@/components/profile/ProfileFriendsPanel";
import EditProfileModal from "@/components/profile/EditProfileModal";
import ReportModal from "@/components/profile/ReportModal";
import RankedRatingCard from "@/components/profile/RankedRatingCard";
import { useProfileData } from "@/hooks/profile/useProfileData";
import { useFriendActions } from "@/hooks/profile/useFriendActions";
import { useProfileReport } from "@/hooks/profile/useProfileReport";
import { UserProfile } from "@/hooks/profile/types";

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

  const CHART_COLORS = [
    "#8b5cf6",
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#06b6d4",
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  const router = useRouter();

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

    const cleanedUsername = tempProfile.username.trim().toLowerCase();

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
        username: cleanedUsername,
      };

      await updateDoc(userRef, payload);
      setUserProfile({ ...userProfile!, ...payload });

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

  const isTrendingUp =
    eloHistory.length >= 2 &&
    eloHistory[eloHistory.length - 1].elo >=
      eloHistory[eloHistory.length - 2].elo;

  const topicStats = setsPlayed.reduce((acc, set) => {
    const topic = set.topic || "General";

    if (!acc[topic]) {
      acc[topic] = {
        name: topic,
        totalScore: 0,
        sets: 0,
        avg: 0,
      };
    }

    acc[topic].totalScore += set.score;
    acc[topic].sets += 1;
    return acc;
  }, {} as Record<string, { name: string; totalScore: number; sets: number; avg: number }>);

  const chartData = Object.values(topicStats)
    .map((stat) => ({
      ...stat,
      avg: Math.round(stat.totalScore / stat.sets),
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 5);

  // helper: build profile path without breaking UID case-sensitivity
  const profilePathFor = (u: Pick<UserProfile, "uid" | "username">) => {
    const uname = (u.username || "").trim();
    if (uname) return `/profile/${uname.toLowerCase()}`;
    return `/profile/${u.uid}`;
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

          <RankedRatingCard
            rating={userProfile?.bElo || 0}
            eloHistory={eloHistory}
            isTrendingUp={isTrendingUp}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid lg:grid-cols-2 gap-6"
        >
          <ProfileFriendsPanel
            loadingFriends={loadingFriends}
            friends={friends}
            incomingRequests={incomingRequests}
            isOwnProfile={auth.currentUser?.uid === profileUid}
            friendUsernameInput={friendUsernameInput}
            onFriendUsernameInputChange={setFriendUsernameInput}
            onAddFriendByUsername={addFriendByUsername}
            onAcceptIncomingRequest={handleAcceptIncomingRequest}
            onDeclineIncomingRequest={handleDeclineIncomingRequest}
            profilePathFor={profilePathFor}
          />

          <DomainMasterySection
            chartData={chartData}
            chartColors={CHART_COLORS}
          />
        </motion.div>

        <RecentSetsCarousel
          setsPlayed={setsPlayed}
          scrollRef={scrollRef}
          onScrollLeft={() => scroll("left")}
          onScrollRight={() => scroll("right")}
        />

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