"use client"; // Required for hooks

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { useRouter } from "next/navigation"; // EDITED: Correct import for App Router
import { FaUserCircle, FaDna, FaStethoscope } from "react-icons/fa";
import SignOutButton from '@/components/ui/SignOutButton'; 

// Define the structure of the user profile data
interface UserProfile {
    displayName: string;
    email: string;
    photoURL: string;
    bElo: number;
    buElo: number;
    muElo: number;
    mElo: number;
    bio: string;
    location: string;
}

export default function ProfilePage() {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const auth = getAuth(app);
    const db = getFirestore(app);

    // Effect to fetch user data on component mount
    useEffect(() => {
        // EDITED: The 'router.isReady' check is not needed with the App Router.
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
                // User is not logged in, redirect to the auth page.
                router.push("/auth");
            }
        });

        // Cleanup the listener when the component unmounts
        return () => unsubscribe();
    // EDITED: Updated dependency array.
    }, [auth, db, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white">
                <p className="text-2xl font-semibold">Loading Profile...</p>
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
        <div className="flex flex-col min-h-screen bg-black text-white p-4 sm:p-6 md:p-8">
            <main className="flex-1 flex items-center justify-center">
                {userProfile && (
                    <div className="w-full max-w-3xl bg-zinc-900 rounded-2xl shadow-lg p-8 transform transition-all hover:scale-[1.01] duration-300">
                        {/* Profile Header */}
                        <div className="flex flex-col items-center text-center border-b border-zinc-700 pb-6 mb-6">
                            {userProfile.photoURL ? (
                                <img
                                    src={userProfile.photoURL}
                                    alt="Profile"
                                    className="w-32 h-32 rounded-full object-cover border-4 border-cyan-600"
                                />
                            ) : (
                                <FaUserCircle className="w-32 h-32 text-cyan-600" />
                            )}
                            <h1 className="text-4xl font-bold mt-4">{userProfile.displayName}</h1>
                        </div>

                        {/* Elo Ratings */}
                        <div className="text-center pb-8">
                            <h2 className="text-2xl font-semibold text-cyan-500 mb-6">Official Elo Ratings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-zinc-800 p-4 rounded-lg flex flex-col items-center justify-center">
                                    <FaDna className="text-4xl text-green-400 mb-2" />
                                    <p className="text-lg font-semibold">USABO Elo</p>
                                    <p className="text-3xl font-bold">{userProfile.bElo}</p>
                                </div>
                                <div className="bg-zinc-800 p-4 rounded-lg flex flex-col items-center justify-center">
                                    <FaStethoscope className="text-4xl text-blue-400 mb-2" />
                                    <p className="text-lg font-semibold">MCAT Elo</p>
                                    <p className="text-3xl font-bold">{userProfile.mElo}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center">
                            <h2 className="text-2xl font-semibold text-cyan-500 mb-6">Unofficial Elo Ratings</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-zinc-800 p-4 rounded-lg flex flex-col items-center justify-center">
                                    <FaDna className="text-4xl text-green-400 mb-2" />
                                    <p className="text-lg font-semibold">USABO Elo</p>
                                    <p className="text-3xl font-bold">{userProfile.buElo}</p>
                                </div>
                                <div className="bg-zinc-800 p-4 rounded-lg flex flex-col items-center justify-center">
                                    <FaStethoscope className="text-4xl text-blue-400 mb-2" />
                                    <p className="text-lg font-semibold">MCAT Elo</p>
                                    <p className="text-3xl font-bold">{userProfile.muElo}</p>
                                </div>
                            </div>
                        </div>
                        
                        <SignOutButton />
                    </div>
                )}
            </main>
        </div>
    );
}