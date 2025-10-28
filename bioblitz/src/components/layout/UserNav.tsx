"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import DefaultAvatar from '@/components/ui/DefaultAvatar';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const UserNav = () => {
  const { user, setIsAuthenticated } = useAuth();
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

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setDropdownOpen(!dropdownOpen)} className="cursor-pointer">
        <div className="relative">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <DefaultAvatar name={user.displayName} />
          )}
        </div>
      </div>
      <div className="flex items-center">
        <span className="text-white">{user.displayName}</span>
        <ChevronDown className="h-4 w-4 text-white" />
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
