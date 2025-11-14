"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DefaultAvatar from '@/components/ui/DefaultAvatar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const UserNav = () => {
  const { user, setIsAuthenticated, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  if (loading) {
    return <div className="h-10 w-10 rounded-full bg-zinc-700 animate-pulse" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center space-x-2">
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="h-11 w-11 rounded-full"
              />
            ) : (
              <DefaultAvatar name={user.displayName} />
            )}
          </div>

        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          aria-label="Open user menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>
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
          <Link href="/settings">
            <span
              className="block px-4 py-2 text-white hover:bg-cyan-700/20 cursor-pointer"
              onClick={() => setDropdownOpen(false)}
            >
              Settings
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
  );
};

export default UserNav;