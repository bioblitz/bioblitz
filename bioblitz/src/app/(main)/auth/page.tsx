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
import { useAuth } from "@/context/AuthContext";
import { Pencil, GraduationCap, School as SchoolIcon, User as UserIcon, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

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
  const router = useRouter();

  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [setsPlayed, setSetsPlayed] = useState<
    { name: string; score: number }[]
  >([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

      if (res.ok) {
        await createUserProfile(user);
        setIsAuthenticated(true); // Update AuthContext
        console.log("Attempting to redirect to /home");
        router.push("/home?justLoggedIn=true");
        console.log("Redirection initiated.");
      } else {
        router.push("/auth");
      }
    });

    return () => unsubscribe();
  }, [auth, db, router]);

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
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

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
                fileInputRef={fileInputRef}
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const MainProfileCard: React.FC<MainProfileCardProps> = ({ user, onSave, onPhotoChange, fileInputRef }) => {
  return (
    <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-700/50 overflow-hidden">
      <div className="p-5 border-b border-zinc-700/50">
        <div className="flex items-start space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onPhotoChange}
            className="hidden"
            accept="image/*"
          />
          <div
            className="relative w-20 h-20 md:w-24 md:h-24 group cursor-pointer shrink-0"
            onClick={() => fileInputRef.current?.click()}
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
      )}
    </div>
  );
};