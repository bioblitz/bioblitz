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
import { Pencil, MapPin, Briefcase, GraduationCap, School as SchoolIcon, User as UserIcon, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation"; // Corrected import for App Router

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

// --- User Profile Data Structure ---
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

// --- Rank Calculation ---
interface Rank {
  name: string;
  color: string;
}

/**
 * Calculates a user's rank based on their Elo rating.
 * Mimics the Codeforces ranking system.
 */
const getRank = (elo: number): Rank => {
  if (elo >= 2100) return { name: "Master", color: "text-orange-500" };
  if (elo >= 1900) return { name: "Candidate Master", color: "text-purple-500" };
  if (elo >= 1600) return { name: "Expert", color: "text-blue-500" };
  if (elo >= 1400) return { name: "Specialist", color: "text-cyan-400" };
  if (elo >= 1200) return { name: "Pupil", color: "text-green-500" };
  return { name: "Newbie", color: "text-gray-400" };
};

// --- Main Profile Page Component ---
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

  // Effect to fetch user profile on auth change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const profileData = userDocSnap.data() as UserProfile;
            setUserProfile(profileData);
            // Initialize temp profile for editing
            setTempProfile({
              bio: profileData.bio || "",
              location: profileData.location || "",
              grade: profileData.grade || "",
              status: profileData.status || "",
              school: profileData.school || "",
            });
            
            // Fetch sets played after profile is loaded
            fetchSetsPlayed(user.uid);

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


  // Function to fetch sets played
  const fetchSetsPlayed = async (uid: string) => {
    try {
      const setsRef = collection(db, "users", uid, "setsPlayed");
      const setsSnap = await getDocs(setsRef);
      const setsData = setsSnap.docs.map((doc) => {
        const data = doc.data() as { score?: number };
        return {
          name: doc.id, // Just use the set name
          score: data.score || 0,
        };
      });
      setSetsPlayed(setsData);
    } catch (err) {
      console.error("Error fetching sets played:", err);
    }
  };

  // Handler for profile picture change
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
      updateUserPhoto(downloadURL); // Update auth context
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      // TODO: Show user-friendly error message
    }
  };

  // Handler for saving profile edits
  const handleSaveEdits = async () => {
    if (!auth.currentUser) return;
    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, { ...tempProfile });
      setUserProfile((prev) => prev ? { ...prev, ...tempProfile } : null);
      setEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      // TODO: Show user-friendly error message
    }
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="w-full max-w-7xl animate-pulse">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column Skeleton */}
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
              {/* Right Column Skeleton */}
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

  // --- Render Error State ---
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  // --- Render Profile Page ---
  if (userProfile) {
    return (
      <main className="flex-1 flex flex-col items-center bg-black text-white p-4 md:p-6">
        <div className="w-full max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* --- Left Column: Main Profile Card --- */}
            <div className="lg:col-span-1">
              <MainProfileCard
                user={userProfile}
                onEdit={() => setEditing(true)}
                onPhotoChange={handleFileChange}
                fileInputRef={fileInputRef}
              />
            </div>

            {/* --- Right Column: Past Games --- */}
            <div className="lg:col-span-2">
              <PastGamesCard sets={setsPlayed} />
            </div>

          </div>
        </div>

        {/* --- Edit Profile Modal --- */}
        {editing && (
          <EditProfileModal
            tempProfile={tempProfile}
            setTempProfile={setTempProfile}
            onClose={() => setEditing(false)}
            onSave={handleSaveEdits}
          />
        )}
      </main>
    );
  }

  return null; // Should be covered by loading/error/redirect
}


// --- Sub-component: MainProfileCard ---
interface MainProfileCardProps {
  user: UserProfile;
  onEdit: () => void;
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const MainProfileCard: React.FC<MainProfileCardProps> = ({ user, onEdit, onPhotoChange, fileInputRef }) => {
  const rank = getRank(user.bElo);
  
  return (
    <div className="bg-zinc-900 rounded-lg shadow-lg border border-zinc-700/50 overflow-hidden">
      {/* Card Header: Avatar, Name, Rank, Elo */}
      <div className="p-5 border-b border-zinc-700/50">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
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
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white truncate" title={user.displayName}>
              {user.displayName}
            </h1>
            <p className={`text-lg font-semibold ${rank.color}`}>
              {rank.name}
            </p>
            <p className="text-md text-zinc-400">
              Rating: <span className="font-bold text-white">{user.bElo}</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Card Body: Profile Details Table */}
      <div className="p-5 space-y-3">
        <InfoRow icon={<UserIcon />} label="About" value={user.bio || "..."} />
        <InfoRow icon={<Briefcase />} label="Status" value={user.status || "..."} />
        <InfoRow icon={<MapPin />} label="Location" value={user.location || "..."} />
        <InfoRow icon={<GraduationCap />} label="Grade" value={user.grade || "..."} />
        <InfoRow icon={<SchoolIcon />} label="School" value={user.school || "..."} />
        <InfoRow 
          icon={<CalendarDays />} 
          label="Player Since" 
          value={user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : "N/A"} 
        />
        
        <button
          onClick={onEdit}
          className="w-full mt-4 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
};

// --- Sub-component: InfoRow (for the profile card) ---
const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start text-sm">
    <span className="text-cyan-400 w-5 h-5 mr-3 mt-0.5 shrink-0">{icon}</span>
    <div className="flex-1 min-w-0">
      <span className="text-zinc-400">{label}: </span>
      <span className="text-white break-words">{value}</span>
    </div>
  </div>
);

// --- Sub-component: PastGamesCard ---
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


// --- Sub-component: EditProfileModal ---
interface EditProfileModalProps {
  tempProfile: {
    bio: string;
    location: string;
    grade: string;
    status: string;
    school: string;
  };
  setTempProfile: React.Dispatch<React.SetStateAction<typeof tempProfile>>;
  onClose: () => void;
  onSave: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ tempProfile, setTempProfile, onClose, onSave }) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTempProfile(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-zinc-800 p-6 rounded-xl w-full max-w-md flex flex-col gap-4 shadow-2xl border border-zinc-700">
        <h3 className="text-xl font-semibold text-white">
          Edit Profile
        </h3>

        <ModalInput name="bio" label="About You" value={tempProfile.bio} onChange={handleChange} as="textarea" />
        <ModalInput name="status" label="Status" value={tempProfile.status} onChange={handleChange} />
        <ModalInput name="location" label="Location" value={tempProfile.location} onChange={handleChange} />
        <ModalInput name="grade" label="Grade" value={tempProfile.grade} onChange={handleChange} />
        <ModalInput name="school" label="School" value={tempProfile.school} onChange={handleChange} />

        <div className="flex justify-end gap-3 mt-2">
          <button
            className="bg-zinc-600 px-4 py-2 rounded-lg hover:bg-zinc-500 text-white transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-cyan-600 px-4 py-2 rounded-lg hover:bg-cyan-700 text-white transition-colors"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Sub-component: ModalInput (for the edit modal) ---
interface ModalInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  as?: "input" | "textarea";
}

const ModalInput: React.FC<ModalInputProps> = ({ label, name, value, onChange, as = "input" }) => (
  <div className="flex flex-col">
    <label className="text-zinc-300 text-sm mb-1">{label}</label>
    {as === "textarea" ? (
      <textarea
        name={name}
        className="p-2 rounded bg-zinc-700 text-white resize-none border border-zinc-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        rows={3}
        value={value}
        onChange={onChange}
      />
    ) : (
      <input
        name={name}
        className="p-2 rounded bg-zinc-700 text-white border border-zinc-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        type="text"
        value={value}
        onChange={onChange}
      />
    )}
  </div>
);