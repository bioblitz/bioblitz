'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Update the path below if your AuthContext is located elsewhere
import { useAuth } from '../../context/AuthContext';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase'; // Assuming your firebase config is here
import { FaUserCircle } from 'react-icons/fa';

export default function MainNavbar() {
  const router = useRouter();
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);

  // Effect to listen for auth changes and fetch user photo
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user && isAuthenticated) {
        try {
          // Fetch the user's profile from the 'users' collection in Firestore
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            // Set the user's photoURL from the document
            setPhotoURL(userDocSnap.data().photoURL);
          }
        } catch (err) {
          console.error("Error fetching user photo for navbar:", err);
        }
      } else {
        // Reset photoURL if user logs out
        setPhotoURL(null);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [isAuthenticated, auth, db]);


  const handleSignOut = async () => {
    try {
        const res = await fetch('/api/sign-out');
        if (res.ok) {
          setIsAuthenticated(false);
          router.push('/auth');
        } else {
          console.error('Failed to sign out');
        }
    } catch (error) {
        console.error('Error during sign out:', error);
    }
  };

  return (
    <nav className="w-full bg-black sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href='/home'>
              <span className="text-white text-2xl font-bold tracking-widest uppercase cursor-pointer">
                BioBlitz
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
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
              <>
                
                <Link href="/profile">
                    {photoURL ? (
                        <img
                            src={photoURL}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500 cursor-pointer"
                        />
                    ) : (
                        <FaUserCircle className="w-10 h-10 text-cyan-600 cursor-pointer" />
                    )}
                </Link>
                
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
