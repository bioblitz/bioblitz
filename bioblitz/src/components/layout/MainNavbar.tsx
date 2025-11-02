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
import { House, Gamepad2, Info } from "lucide-react"; // Importing icons

export default function MainNavbar() {
  const router = useRouter();
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="flex items-center space-x-2">
            <div
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="cursor-pointer"
            >
              <Zap className="w-8 h-8 text-[#8c52ff]" />
            </div>

            <Link href="/home">
              <span className="text-[#8c52ff] text-2xl font-bold tracking-widest lowercase cursor-pointer">
                BioBlitz
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4 relative">
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
                    <FaUserCircle className="w-10 h-10 text-[#8c52ff]/80 cursor-pointer" />
                  )}
                </div>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-zinc-900 rounded-lg shadow-lg overflow-hidden z-50">
                    <Link href="/profile">
                      <span
                        className="block px-4 py-2 text-white hover:bg-[#5CA3FF]/80 cursor-pointer"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </span>
                    </Link>
                    <span
                      className="block px-4 py-2 text-white hover:bg-[#5CA3FF]/80  cursor-pointer"
                      onClick={handleSignOut}
                    >
                      Sign Out
                    </span>

                    <Link
                      href="/settings"
                      className="block px-4 py-2 text-white hover:bg-[#5CA3FF]/80  cursor-pointer"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Settings
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <>
          <div
            className="bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          ></div>

          <div
            className={`fixed top-16 left-0 h-[calc(100%-4rem)] ml-2 w-20 bg-zinc-950 shadow-xl p-6 z-50 transform transition-transform duration-300 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <ul className="space-y-2">
              <li>
                <Link
                  href="/home"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 text-white  hover:text-[#5CA3FF]/80 "
                >
                  <House size={35} />
                </Link>
              </li>
              <li>
                <Link
                  href="/contests"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 text-white hover:text-[#5CA3FF]/80 "
                >
                  <Gamepad2 size={35} />
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 text-white hover:text-[#5CA3FF]/80 "
                >
                  <Info size={35} />
                </Link>
              </li>
            </ul>
          </div>
        </>
      )}
    </nav>
  );
}
