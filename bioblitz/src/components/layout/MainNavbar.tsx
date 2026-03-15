"use client";

import { getAuth } from "firebase/auth";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import DefaultAvatar from "@/components/ui/DefaultAvatar";
import { Zap, House, Trophy, Menu, Flame, Search, ChevronUp } from "lucide-react";
import { signOut } from "firebase/auth";
import { app } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import NotificationBell from "@/components/NotificationBell";

export default function MainNavbar() {
  const { isAuthenticated, user, setIsAuthenticated, loading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ type: string; title: string; subtitle: string; href: string }>>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [streak, setStreak] = useState(0);
  const [streakActive, setStreakActive] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const roles = Array.isArray(user?.roles)
    ? user.roles.map((role: unknown) => String(role).toLowerCase())
    : [];
  const isAdmin = roles.includes("admin");
  const isStaff = isAdmin || roles.includes("staff");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    setSearchLoading(true);
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error("Search failed");
        }
        const data = await response.json();
        const results = Array.isArray(data.results) ? data.results : [];
        setSearchResults(results);
        setSearchOpen(true);
      } catch (error) {
        setSearchResults([]);
        setSearchOpen(true);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    if (user?.uid) {
      const db = getFirestore(app);
      const userRef = doc(db, "users", user.uid);

      const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          setStreak(data.streak || 0);

          if (data.lastStreakDate) {
            const lastDate = data.lastStreakDate.toDate();
            const now = new Date();

            const pstOptions: Intl.DateTimeFormatOptions = {
              timeZone: "America/Los_Angeles",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            };

            const lastDatePst = lastDate.toLocaleDateString(
              "en-US",
              pstOptions
            );
            const nowDatePst = now.toLocaleDateString("en-US", pstOptions);

            setStreakActive(lastDatePst === nowDatePst);
          } else {
            setStreakActive(false);
          }
        }
      });

      return () => unsubscribe();
    } else {
      setStreak(0);
      setStreakActive(false);
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      const auth = getAuth(app);
      await signOut(auth);
      setIsAuthenticated(false);
      router.push("/auth");
    } catch (error) {
      console.error("Error during sign out:", error);
    }
    setDropdownOpen(false);
  };

  const navItems = [
    { name: "Home", href: "/home", icon: House },
    { name: "Daily Problem", href: "/potd", icon: Flame },
  ];

  const allPages = [
    { name: "Home", href: "/home", icon: House },
    { name: "Daily Problem", href: "/potd", icon: Flame },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Contests", href: "/contests", icon: Trophy },
    { name: "Categories", href: "/categories", icon: Trophy },
    { name: "Channel", href: "/channel", icon: Trophy },
    { name: "About", href: "/about", icon: Trophy },
    { name: "Settings", href: "/settings", icon: Trophy },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthenticated(!!currentUser);
    });
    return () => unsubscribe();
  }, []);

  const renderUserNav = () => {
    if (loading) {
      return (
        <div className="h-10 w-10 rounded-full bg-zinc-700 animate-pulse" />
      );
    }
    if (!isAuthenticated || !user) {
      return (
        <Link
          href="/auth"
          className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Sign In
        </Link>
      );
    }
    return (
      <div className="flex items-center gap-4">
        <div
          className="hidden md:flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full"
          title="Current Streak"
        >
          <Flame
            className={`w-4 h-4 text-orange-500 ${
              streakActive ? "fill-orange-500" : "fill-transparent"
            }`}
          />
          <span className="text-sm font-bold text-orange-400">{streak}</span>
        </div>
        <NotificationBell />
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 p-2 rounded-lg transition-colors group"
            aria-label="Toggle user menu"
          >
            <div className="text-left hidden lg:block">
              <h2 className="font-bold text-white text-sm">
                {user.displayName || ""}
              </h2>
            </div>

            <div className="relative">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="h-10 w-10 rounded-full object-cover border border-zinc-700"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.onerror = null;
                    target.src = "/images/logo.svg";
                  }}
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
            <div className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="md:hidden px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-zinc-400 text-sm">Streak</span>
                <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                  <Flame
                    className={`w-4 h-4 text-orange-500 ${
                      streakActive ? "fill-orange-500" : "fill-transparent"
                    }`}
                  />
                  {streak}
                </div>
              </div>

              {user?.username && (
                <Link href={`/profile/${user.username}`}>
                  <span
                    className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Profile
                  </span>
                </Link>
              )}
              <Link
                href={user?.username ? `/channel/${user.username}` : "/channel"}
              >
                <span
                  className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  Channel
                </span>
              </Link>
              <Link href="/settings">
                <span
                  className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  Settings
                </span>
              </Link>
              {isStaff && (
                <Link href="/staff">
                  <span
                    className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Staff
                  </span>
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin">
                  <span
                    className="block px-4 py-3 text-sm text-zinc-300 hover:text-white hover:bg-zinc-900 cursor-pointer transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Admin
                  </span>
                </Link>
              )}
              <div className="border-t border-zinc-800 mt-1">
                <span
                  className="block px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors"
                  onClick={handleSignOut}
                >
                  Sign Out
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          scrolled || isSidebarOpen
            ? "bg-black/80 backdrop-blur-md border-white/10"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen((open) => !open)}
                className="p-2 text-zinc-400 hover:text-white focus:outline-none"
                aria-label="Open navigation"
              >
                <Menu size={22} />
              </button>

              <Link href="/home" className="flex items-center space-x-2 group">
                <div className="bg-yellow-400/10 p-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors">
                  <Zap className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-white text-xl font-bold tracking-widest uppercase bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                  BioBlitz
                </span>
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const isDaily = item.href === "/daily";

                let activeClass = "";
                let iconClass = "";

                if (isActive) {
                  if (isDaily) {
                    activeClass =
                      "bg-orange-600/20 text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.2)] border border-orange-500/20";
                    iconClass = "text-orange-400";
                  } else {
                    activeClass =
                      "bg-violet-600/15 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.15)] border border-violet-500/10";
                    iconClass = "text-violet-400";
                  }
                } else {
                  activeClass = "text-zinc-400 hover:text-white hover:bg-white/5";
                  iconClass = "";
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 text-sm font-medium px-4 py-2 rounded-full transition-all duration-300 ${activeClass}`}
                  >
                    <item.icon size={18} className={iconClass} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            <div className="hidden md:block relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchResults[0]) {
                      router.push(searchResults[0].href);
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search"
                  className="w-80 bg-zinc-900/70 border border-zinc-800 rounded-full pl-9 pr-9 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
                />
                {searchLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
                    ...
                  </span>
                )}
              </div>

              {searchOpen && (
                <div className="absolute left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-zinc-500">No results found.</div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {searchResults.map((result, index) => (
                        <Link
                          key={`${result.type}-${index}`}
                          href={result.href}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
                        >
                          <span className="text-[10px] uppercase tracking-widest text-zinc-500 border border-zinc-800 rounded-full px-2 py-0.5">
                            {result.type}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-zinc-100 truncate">{result.title}</span>
                            {result.subtitle && (
                              <span className="text-xs text-zinc-500 truncate">{result.subtitle}</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {renderUserNav()}
            </div>
          </div>
        </div>
      </nav>

      {isSidebarOpen && (
        <div
          className="fixed left-0 right-0 bottom-0 top-16 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-16 left-0 h-[calc(100%-4rem)] w-60 bg-zinc-950 border-r border-zinc-800 z-50 transform transition-transform duration-300 ease-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isSidebarOpen}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-zinc-800">
          <span className="text-sm uppercase tracking-[0.3em] text-zinc-400">
            Pages
          </span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-zinc-400 hover:text-white"
            aria-label="Close navigation"
          >
            <ChevronUp size={20} />
          </button>
        </div>

        <div className="px-3 py-4 space-y-1">
          {allPages.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <item.icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          {isStaff && (
            <Link
              href="/staff"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Trophy size={18} />
              <span>Staff</span>
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setIsSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Trophy size={18} />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
