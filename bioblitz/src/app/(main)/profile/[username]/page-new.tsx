"use client";

import { useState, useEffect, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
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
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { isUsernameUnique, updateUserPhoto } from "@/lib/user";
import ImageCropper from "@/components/ui/ImageCropper";
import { createNotification } from "@/lib/notifications";
import { UserProfile } from "@/types";
import {
  ProfileHeader,
  ProfileStats,
  EloChart,
  ActivityCalendar,
  TopicPerformanceChart,
  RecentSets,
  FriendsSection,
  EditProfileModal,
  ReportModal,
} from "@/components/profile";

interface EloHistoryPoint {
  date: string;
  elo: number;
  fullDate: string;
}

interface SetPlayed {
  name: string;
  score: number;
  topic: string;
  setId: string;
  playedAt: number;
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

  const [setsPlayed, setSetsPlayed] = useState<SetPlayed[]>([]);
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
  const [imageToEdit, setImageToEdit] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string>("image/jpeg");
  const [pfpLoading, setPfpLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [reporting, setReporting] = useState(false);
  const [reportCategory, setReportCategory] = useState("Inappropriate Content");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const isOwnProfile = auth.currentUser?.uid === profileUid;

  // Fetch user profile by username
  useEffect(() => {
    const fetchUserByUsername = async () => {
      try {
        setLoading(true);
        let q = query(collection(db, "users"), where("username", "==", usernameParam));
        let snapshot = await getDocs(q);

        if (snapshot.empty) {
          const normalizedUsername = usernameParam.toLowerCase();
          const allUsersSnapshot = await getDocs(collection(db, "users"));
          const matchingDoc = allUsersSnapshot.docs.find(doc => {
            const username = doc.data().username;
            return username && username.toLowerCase() === normalizedUsername;
          });

          if (matchingDoc) {
            const userData = matchingDoc.data() as UserProfile;
            setProfileUid(matchingDoc.id);
            setUserProfile({ ...userData, uid: matchingDoc.id });
            setLoading(false);
            return;
          }

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

    const fetchData = async () => {
      try {
        const setsRef = collection(db, "users", profileUid, "setsPlayed");
        const setsSnap = await getDocs(setsRef);

        const sortedDocs = setsSnap.docs.sort((a, b) => {
          const dataA = a.data();
          const dataB = b.data();
          const timeA = dataA.lastPlayedAt?.toMillis() || dataA.playedAt?.toMillis() || 0;
          const timeB = dataB.lastPlayedAt?.toMillis() || dataB.playedAt?.toMillis() || 0;
          return timeB - timeA;
        });

        const setsData = await Promise.all(
          sortedDocs.map(async (playedDoc) => {
            const playedData = playedDoc.data();
            const playedAt = playedData.lastPlayedAt?.toMillis() || playedData.playedAt?.toMillis() || 0;
            const originalSetId = playedData.setId || playedData.setID || playedData.id || playedDoc.id;

            let topic = playedData.topic || playedData.Topic || playedData.category || "General";
            let title = playedData.title || "Unknown Set";

            if (originalSetId) {
              try {
                const originalSetRef = doc(db, "sets", originalSetId);
                const originalSetSnap = await getDoc(originalSetRef);
                if (originalSetSnap.exists()) {
                  const originalData = originalSetSnap.data();
                  topic = originalData.topic || originalData.Topic || originalData.category || topic;
                  title = originalData.title || title;
                }
              } catch (e) {
                console.error("Error fetching set data:", e);
              }
            }

            return {
              name: title,
              score: playedData.score || 0,
              topic,
              setId: originalSetId,
              playedAt,
            };
          })
        );

        setSetsPlayed(setsData);

        const eloRef = collection(db, "users", profileUid, "eloHistory");
        const eloSnap = await getDocs(eloRef);
        const eloData: EloHistoryPoint[] = eloSnap.docs
          .map((d) => {
            const data = d.data();
            const timestamp = data.timestamp?.toMillis() || Date.now();
            const date = new Date(timestamp);
            return {
              date: `${date.getMonth() + 1}/${date.getDate()}`,
              elo: data.elo || 1200,
              fullDate: date.toISOString(),
            };
          })
          .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());

        setEloHistory(eloData);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();
  }, [profileUid, db]);

  useEffect(() => {
    if (!profileUid || !auth.currentUser) return;

    const fetchFriends = async () => {
      setLoadingFriends(true);
      try {
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

        if (auth.currentUser?.uid === profileUid) {
          const requestsQuery = query(
            collection(db, "users", auth.currentUser.uid, "friends"),
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
          setIncomingRequests(requestsData.filter((u): u is UserProfile => u !== null));
        }
      } catch (err) {
        console.error("Error fetching friends/requests:", err);
      } finally {
        setLoadingFriends(false);
      }
    };

    fetchFriends();
  }, [auth.currentUser, db, profileUid]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userProfile || !auth.currentUser) return;
    const file = e.target.files[0];
    const type = file.type || "image/jpeg";
    setImageType(type);

    const reader = new FileReader();
    reader.onload = () => {
      setImageToEdit(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    if (!auth.currentUser || !userProfile) return;

    setPfpLoading(true);
    setImageToEdit(null);

    try {
      const extension = imageType.split("/")[1] || "jpg";
      const file = new File([croppedImage], `pfp-${Date.now()}.${extension}`, { type: imageType });
      const profileRef = storageRef(storage, `profilePictures/${auth.currentUser.uid}/${file.name}`);
      await uploadBytes(profileRef, file);
      const downloadURL = await getDownloadURL(profileRef);
      await updateUserPhoto(auth.currentUser.uid, downloadURL);
      setUserProfile({ ...userProfile, photoURL: downloadURL });
    } catch (err) {
      console.error(err);
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

  const handleReportSubmit = async () => {
    if (!auth.currentUser || !profileUid) return;

    setIsSubmittingReport(true);
    try {
      await createNotification(
        auth.currentUser.uid,
        "system",
        "Submitted Report",
        `${userProfile?.displayName ?? "A user"} was reported`,
        `/profile/${userProfile?.username}`,
        auth.currentUser.photoURL || "",
        auth.currentUser.displayName || "A user"
      );
      setReportSuccess(true);
      setTimeout(() => {
        setReporting(false);
        setReportSuccess(false);
        setReportDescription("");
      }, 2000);
    } catch (err) {
      console.error("Error submitting report:", err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const isTrendingUp =
    eloHistory.length >= 2 &&
    eloHistory[eloHistory.length - 1].elo >= eloHistory[eloHistory.length - 2].elo;

  const handlePrevMonth = () => {
    setCalendarViewDate(
      new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    const nextDate = new Date(
      calendarViewDate.getFullYear(),
      calendarViewDate.getMonth() + 1,
      1
    );
    if (nextDate <= new Date()) {
      setCalendarViewDate(nextDate);
    }
  };

  const activeDates = new Set(
    setsPlayed.map((set) => {
      const date = set.playedAt ? new Date(set.playedAt) : new Date();
      return date.toDateString();
    })
  );

  const isCurrentMonth =
    new Date().getMonth() === calendarViewDate.getMonth() &&
    new Date().getFullYear() === calendarViewDate.getFullYear();

  const uniqueRatedSets = Array.from(
    setsPlayed
      .reduce((map, set) => {
        if (!set.setId) return map;
        const existing = map.get(set.setId);
        if (!existing || (set.playedAt && set.playedAt < existing.playedAt)) {
          map.set(set.setId, set);
        }
        return map;
      }, new Map<string, SetPlayed>())
      .values()
  );

  const topicStats = uniqueRatedSets.reduce((acc, set) => {
    const topic = set.topic || "General";
    if (!acc[topic]) {
      acc[topic] = { name: topic, totalScore: 0, sets: 0, avg: 0 };
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Loading profile...</p>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-red-500">{error || "Profile not found"}</p>
      </div>
    );
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
      />

      {imageToEdit && (
        <ImageCropper
          image={imageToEdit}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspect={1}
          title="Adjust Profile Picture"
          imageType={imageType}
        />
      )}

      <main className="min-h-screen bg-black text-white pt-20">
        <ProfileHeader
          userProfile={userProfile}
          isOwnProfile={isOwnProfile}
          pfpLoading={pfpLoading}
          onEditClick={() => setEditing(true)}
          onImageClick={() => fileInputRef.current?.click()}
          onReportClick={() => setReporting(true)}
        />

        <div className="max-w-6xl mx-auto px-6 py-8">
          <ProfileStats
            bElo={userProfile.bElo}
            setsPlayedCount={setsPlayed.length}
            isTrendingUp={isTrendingUp}
            streak={userProfile.streak}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <EloChart eloHistory={eloHistory} />
            <ActivityCalendar
              calendarViewDate={calendarViewDate}
              activeDates={activeDates}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              isCurrentMonth={isCurrentMonth}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <TopicPerformanceChart chartData={chartData} />
            <FriendsSection
              friends={friends}
              incomingRequests={incomingRequests}
              loadingFriends={loadingFriends}
              isOwnProfile={isOwnProfile}
            />
          </div>

          <RecentSets setsPlayed={setsPlayed} scrollRef={scrollRef} />
        </div>
      </main>

      <EditProfileModal
        isOpen={editing}
        tempProfile={tempProfile}
        editError={editError}
        onClose={() => setEditing(false)}
        onSave={saveChanges}
        onChange={(field, value) => setTempProfile({ ...tempProfile, [field]: value })}
      />

      <ReportModal
        isOpen={reporting}
        reportCategory={reportCategory}
        reportDescription={reportDescription}
        isSubmitting={isSubmittingReport}
        success={reportSuccess}
        onClose={() => setReporting(false)}
        onCategoryChange={setReportCategory}
        onDescriptionChange={setReportDescription}
        onSubmit={handleReportSubmit}
      />
    </>
  );
}
