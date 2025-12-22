"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import DefaultAvatar from "@/components/ui/DefaultAvatar";
import { Zap, House, Trophy, Menu, X } from "lucide-react";

export default function MainNavbar() {
  const { isAuthenticated, user, setIsAuthenticated, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const navItems = [
    { name: "Home", href: "/home", icon: House },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const renderUserNav = () => {
    if (loading) {
      return <div className="h-10 w-10 rounded-full bg-zinc-700 animate-pulse" />;
    }
    if (!isAuthenticated || !user) {
      return null;
    }
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 p-2 rounded-lg transition-colors group"
          aria-label="Toggle user menu"
        >
        <div className="text-left">
          <h2 className="font-bold text-white">{user.username || ""}</h2>
        </div>

        <div className="relative">
          {user.photoURL ? (
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="h-11 w-11 rounded-full object-cover"
          />
          ) : (
        <DefaultAvatar name={user.displayName} />
      )}
    </div>

    <div className="text-zinc-400 group-hover:text-white transition-colors">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={`w-5 h-5 transition-transform duration-200 ${
          dropdownOpen ? "rotate-180" : ""
        }`}
      >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
      </svg>
        </div>
        </button>

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
            <Link href={user?.username ? `/channel/${user.username}` : '/channel'}>
              <span
                className="block px-4 py-2 text-white hover:bg-cyan-700/20 cursor-pointer"
                onClick={() => setDropdownOpen(false)}
              >
                Channel
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

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
        scrolled || isMobileMenuOpen
          ? "bg-black/80 backdrop-blur-md border-white/10"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/home" className="flex items-center space-x-2 group">
            <div className="bg-yellow-400/10 p-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <span className="text-white text-xl font-bold tracking-widest uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              BioBlitz
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-violet-600/15 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.15)] border border-violet-500/10"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon size={18} className={isActive ? "text-violet-400" : ""} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            {renderUserNav()}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white focus:outline-none"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden absolute w-full bg-zinc-950 border-b border-white/10 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden ${
          isMobileMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pt-2 pb-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}