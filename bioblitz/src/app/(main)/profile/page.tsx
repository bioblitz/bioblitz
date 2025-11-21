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
<<<<<<< Updated upstream
import { Pencil } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import router from "next/router";
=======
import { Pencil, GraduationCap, School as SchoolIcon, User as UserIcon, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
>>>>>>> Stashed changes

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
<<<<<<< Updated upstream
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
=======
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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

=======
>>>>>>> Stashed changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
<<<<<<< Updated upstream
            setUserProfile(userDocSnap.data() as UserProfile);
=======
            const profileData = userDocSnap.data() as UserProfile;
            setUserProfile(profileData);
            fetchSetsPlayed(user.uid);
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
  const fetchSetsPlayed = async (uid: string) => {
    try {
      const setsRef = collection(db, "users", uid, "setsPlayed");
      const setsSnap = await getDocs(setsRef);
      const setsData = setsSnap.docs.map((doc) => {
        const data = doc.data() as { score?: number; title?: string };
        return {
          name: data.title || doc.id,
          score: data.score || 0,
        };
      });
      setSetsPlayed(setsData);
    } catch (err) {
      console.error("Error fetching sets played:", err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !userProfile || !auth.currentUser) return;
    const file = e.target.files[0];

    try {
      const profileImageRef = storageRef(
        storage,
        `profilePictures/${auth.currentUser.uid}`
      );
      await uploadBytes(profileImageRef, file);
      const downloadURL = await getDownloadURL(profileImageRef);

      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, { photoURL: downloadURL });

      setUserProfile({ ...userProfile, photoURL: downloadURL });
      updateUserPhoto(downloadURL);
    } catch (err) {
      console.error("Error uploading profile picture:", err);
    }
  };

  const handleFieldSave = async (fieldKey: string, newValue: string) => {
    if (!auth.currentUser) return;
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    try {
      await updateDoc(userDocRef, {
        [fieldKey]: newValue,
      });
      setUserProfile((prev) => (prev ? { ...prev, [fieldKey]: newValue } : null));
    } catch (err) {
      console.error("Error saving field:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="w-full max-w-7xl animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-zinc-900 rounded-lg p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 bg-zinc-700 rounded-full" />
                <div className="space-y-2">
                  <div className="h-6 w-40 bg-zinc-700 rounded-md" />
                  <div className="h-4 w-24 bg-zinc-700 rounded-md" />
                  <div className="h-4 w-20 bg-zinc-700 rounded-md" />
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <div className="h-4 w-full bg-zinc-700 rounded-md" />
                <div className="h-4 w-3/4 bg-zinc-700 rounded-md" />
                <div className="h-4 w-1/2 bg-zinc-700 rounded-md" />
              </div>
            </div>
            <div className="lg:col-span-2 bg-zinc-900 rounded-lg p-6 space-y-4">
              <div className="h-6 w-48 bg-zinc-700 rounded-md" />
              <div className="h-8 w-full bg-zinc-700 rounded-md" />
              <div className="h-8 w-full bg-zinc-700 rounded-md" />
              <div className="h-8 w-full bg-zinc-700 rounded-md" />
            </div>
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
  if (userProfile) {
    return (
      <main className="flex-1 flex flex-col items-center bg-black text-white p-4 md:p-6 min-h-screen">
        <div className="w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <MainProfileCard
                user={userProfile}
                onSave={handleFieldSave}
                onPhotoChange={handleFileChange}
              />
            </div>
            <div className="lg:col-span-2">
              <PastGamesCard sets={setsPlayed} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

interface MainProfileCardProps {
  user: UserProfile;
  onSave: (fieldKey: string, newValue: string) => Promise<void>;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const MainProfileCard: React.FC<MainProfileCardProps> = ({ user, onSave, onPhotoChange }) => {
  return (
    <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-700/50 overflow-hidden">
      <div className="p-5 border-b border-zinc-700/50">
        <div className="flex items-start space-x-4">
          <input
            type="file"
            onChange={onPhotoChange}
            className="hidden"
            accept="image/*"
          />
          <div
            className="relative w-20 h-20 md:w-24 md:h-24 group cursor-pointer shrink-0"
          >
            <img
              src={user.photoURL}
              alt="Profile"
              className="w-full h-full rounded-full object-cover ring-2 ring-zinc-700 transition-opacity duration-300 group-hover:opacity-50"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white">
              <Pencil className="w-6 h-6" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white truncate" title={user.displayName}>
              {user.displayName}
            </h1>
            <p className="text-md text-zinc-400">
              Rating: <span className="font-bold text-white">{user.bElo}</span>
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 space-y-3">
        <EditableInfoRow icon={<UserIcon />} label="About" value={user.bio || ""} fieldKey="bio" onSave={onSave} isTextarea={true} />
        <EditableInfoRow icon={<GraduationCap />} label="Grade" value={user.grade || ""} fieldKey="grade" onSave={onSave} />
        <EditableInfoRow icon={<SchoolIcon />} label="School" value={user.school || ""} fieldKey="school" onSave={onSave} />
        <StaticInfoRow
          icon={<CalendarDays />}
          label="Player Since"
          value={user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : "N/A"}
        />
      </div>
    </div>
  );
};

const StaticInfoRow: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start text-sm">
    <span className="text-cyan-400 w-5 h-5 mr-3 mt-0.5 shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <span className="text-zinc-400">{label}: </span>
      <span className="text-white break-words">{value}</span>
    </div>
  </div>
);

interface EditableInfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  fieldKey: string;
  onSave: (fieldKey: string, newValue: string) => Promise<void>;
  isTextarea?: boolean;
}

const EditableInfoRow: React.FC<EditableInfoRowProps> = ({ icon, label, value, fieldKey, onSave, isTextarea = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleSaveClick = async () => {
    await onSave(fieldKey, currentValue);
    setIsEditing(false);
  };

  const handleCancelClick = () => {
    setCurrentValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-start text-sm gap-2">
        <span className="text-cyan-400 w-5 h-5 mr-3 mt-2.5 shrink-0">{icon}</span>
        <div className="flex-1 min-w-0 space-y-2">
          <span className="text-zinc-400 text-xs">{label}</span>
          {isTextarea ? (
            <textarea
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="p-2 w-full rounded bg-zinc-700 text-white resize-none border border-zinc-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              rows={3}
            />
          ) : (
            <input
              type="text"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="p-2 w-full rounded bg-zinc-700 text-white border border-zinc-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          )}
          <div className="flex justify-end gap-2">
            <button onClick={handleCancelClick} className="text-zinc-400 hover:text-white text-xs px-2 py-1">Cancel</button>
            <button onClick={handleSaveClick} className="bg-cyan-600 text-white px-3 py-1 rounded-md hover:bg-cyan-700 text-xs">Save</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start text-sm group">
      <span className="text-cyan-400 w-5 h-5 mr-3 mt-0.5 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className="text-zinc-400">{label}: </span>
        <span className="text-white break-words">{value || "..."}</span>
      </div>
      <button onClick={() => setIsEditing(true)} className="ml-2 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-white transition-opacity">
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
};

const PastGamesCard: React.FC<{ sets: { name: string, score: number }[] }> = ({ sets }) => {
  return (
    <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-700/50">
      <h2 className="text-2xl font-semibold text-white p-5 border-b border-zinc-700/50">
        Recent Activity
      </h2>
      
      {sets.length === 0 ? (
        <p className="p-5 text-zinc-400">No games played yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-left">
            <thead>
              <tr className="border-b border-zinc-700/50">
                <th className="px-5 py-3 text-sm font-medium text-zinc-400 uppercase">Set Name</th>
                <th className="px-5 py-3 text-sm font-medium text-zinc-400 uppercase text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((set, i) => (
                <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                  <td className="px-5 py-4 text-white font-medium truncate" title={set.name}>
                    {set.name}
                  </td>
                  <td className="px-5 py-4 text-white font-bold text-right">
                    {set.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
>>>>>>> Stashed changes
      )}
    </main>
  );
<<<<<<< Updated upstream
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
=======
};
>>>>>>> Stashed changes
