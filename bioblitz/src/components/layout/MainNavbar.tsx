"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { FaUserCircle } from "react-icons/fa";
import { Zap } from "lucide-react";

export default function MainNavbar() {
  const router = useRouter();
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);

  // Fetch user photo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user && isAuthenticated) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            setPhotoURL(userDocSnap.data().photoURL);
          } else {
            setPhotoURL(user.photoURL || null); // fallback to Google photo
          }
        } catch (err) {
          console.error("Error fetching user photo for navbar:", err);
        }
      } else {
        setPhotoURL(null);
      }
    });

    return () => unsubscribe();
  }, [isAuthenticated, auth, db]);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSignOut = async () => {
    try {
      const res = await fetch("/api/sign-out");
      if (res.ok) {
        setIsAuthenticated(false);
        router.push("/auth");
      } else {
        console.error("Failed to sign out");
      }
    } catch (error) {
      console.error("Error during sign out:", error);
    }
    setDropdownOpen(false);
  };

  return (
    <nav className="w-full bg-black sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/home">
              <span className="flex items-center text-white text-2xl font-bold tracking-widest uppercase cursor-pointer space-x-2">
                <Zap className="w-8 h-8 text-cyan-700" />
                <span>BioBlitz</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4 relative">
            <Link href="/contests">
              <span className="hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 text-medium cursor-pointer">
                Contests
              </span>
            </Link>

            <Link href="/about">
              <span className="hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition duration-300 text-medium cursor-pointer">
                About
              </span>
            </Link>

            {isAuthenticated && (
              <div className="relative" ref={dropdownRef}>
                <div onClick={() => setDropdownOpen(!dropdownOpen)}>
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt="Profile"
                      className="w-10 h-10 rounded-full object-cover  cursor-pointer"
                    />
                  ) : (
                    <FaUserCircle className="w-10 h-10 text-cyan-600 cursor-pointer" />
                  )}
                </div>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-zinc-900 rounded-lg shadow-lg overflow-hidden z-50">
                    <Link href="/profile">
                      <span
                        className="block px-4 py-2 text-white hover:bg-cyan-700/20 cursor-pointer"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </span>
                    </Link>
                    <span
                      className="block px-4 py-2 text-white hover:bg-cyan-700/20 cursor-pointer"
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
