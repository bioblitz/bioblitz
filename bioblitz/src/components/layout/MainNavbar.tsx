import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { getAuth } from "firebase/auth";
import DefaultAvatar from "@/components/ui/DefaultAvatar";
import {
  Zap,
  House,
  Trophy,
  Flame,
  Plus,
  Hammer,
  ShieldUser,
  Swords,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { app } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "./SearchBar";
import { BarChart2 } from "lucide-react";
/**hi */

export default function MainNavbar() {
  const { isAuthenticated, user, setIsAuthenticated, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [railOpen, setRailOpen] = useState(false);
  const [suppressRailHover, setSuppressRailHover] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeLong, setRouteLong] = useState(false);

  const [streak, setStreak] = useState(0);
  const [streakActive, setStreakActive] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

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
              pstOptions,
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

  useEffect(() => {
    setRouteLoading(true);
    setRouteLong(false);
    const longHandle = window.setTimeout(() => {
      setRouteLong(true);
    }, 600);
    const handle = window.setTimeout(() => {
      setRouteLoading(false);
    }, 180);

    return () => {
      window.clearTimeout(handle);
      window.clearTimeout(longHandle);
    };
  }, [pathname]);

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

  const createHref = user?.username ? `/channel/${user.username}` : "/channel";
  const sideItems = [
    { name: "Home", href: "/home", icon: House },
    { name: "Daily Problem", href: "/potd", icon: Flame },
    {
      name: "Leaderboard",
      href: "/leaderboard",
      icon: Trophy,
    },
    { name: "Compete", href: "/challenges", icon: Swords },
    { name: "Create", href: createHref, icon: Plus },
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
      <div
        className={`route-progress-bar ${routeLoading ? "is-active" : ""} ${
          routeLong ? "is-long" : ""
        }`}
      />
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 border-b ${
          scrolled
            ? "bg-neutral-900/80 backdrop-blur-md border-white/10"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="bg-yellow-400/10 p-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors">
                <img
                  src="/icons/favicon.ico"
                  className="w-6 h-6"
                  alt="BioBlitz"
                />
              </div>
              <span
                style={{ fontFamily: "'nunito', sans-serif", fontWeight: 800 }}
                className="text-white text-xl"
              >
                BioBlitz
              </span>
            </Link>

            <SearchBar />

            <div className="flex items-center space-x-4">{renderUserNav()}</div>
          </div>
        </div>
      </nav>

      <aside
        className={`fixed left-0 top-16 h-[calc(100%-4rem)] w-56 z-40 flex items-center justify-start overflow-visible -translate-y-8 pointer-events-none transition-all duration-200 ${
          railOpen ? "bg-neutral-900/95 border-r border-zinc-800/60 shadow-[4px_0_24px_rgba(0,0,0,0.5)]" : "bg-transparent"
        }`}
        onMouseLeave={() => {
          setRailOpen(false);
          setSuppressRailHover(false);
        }}
      >
        <div
          className="w-16 flex flex-col items-center justify-center py-6 gap-1 ml-2 pointer-events-auto"
          onMouseEnter={() => {
            if (!suppressRailHover) setRailOpen(true);
          }}
        >
          {sideItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group/railitem relative w-12 h-10 rounded-lg flex items-center justify-center transition-all duration-150 overflow-visible ${
                  isActive
                    ? "text-yellow-300 bg-yellow-300/10"
                    : "text-white/50 hover:text-white hover:bg-white/8"
                }`}
                title={item.name}
                aria-label={item.name}
                onClick={() => {
                  setRailOpen(false);
                  setSuppressRailHover(true);
                }}
              >
                <item.icon size={20} />
                <span
                  className={`absolute left-14 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive ? "text-yellow-300" : "text-zinc-200"
                  } ${
                    railOpen
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 translate-x-1"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
          {isStaff && (
            <Link
              href="/staff"
              className={`group/railitem relative w-12 h-10 rounded-lg flex items-center justify-center transition-all duration-150 overflow-visible ${
                pathname === "/staff"
                  ? "text-yellow-300 bg-yellow-300/10"
                  : "text-white/50 hover:text-white hover:bg-white/8"
              }`}
              title="Staff"
              aria-label="Staff"
              onClick={() => {
                setRailOpen(false);
                setSuppressRailHover(true);
              }}
            >
              <ShieldUser size={20} />
              <span
                className={`absolute left-14 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  pathname === "/staff" ? "text-yellow-300" : "text-zinc-200"
                } ${
                  railOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-1"
                }`}
              >
                Staff
              </span>
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className={`group/railitem relative w-12 h-10 rounded-lg flex items-center justify-center transition-all duration-150 overflow-visible ${
                pathname === "/admin"
                  ? "text-yellow-300 bg-yellow-300/10"
                  : "text-white/50 hover:text-white hover:bg-white/8"
              }`}
              title="Admin"
              aria-label="Admin"
              onClick={() => {
                setRailOpen(false);
                setSuppressRailHover(true);
              }}
            >
              <Hammer size={20} />
              <span
                className={`absolute left-14 text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  pathname === "/admin" ? "text-yellow-300" : "text-zinc-200"
                } ${
                  railOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-1"
                }`}
              >
                Admin
              </span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
