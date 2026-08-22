"use client";

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
  BookOpen,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { app } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import NotificationBell from "@/components/NotificationBell";
import SearchBar from "./SearchBar";
import { trackAnalyticsEvent } from "@/lib/analytics-client";
import { MessageCircle } from "lucide-react";
import { useChatStore } from "@/lib/chatStore";
import { hasAiChatAccess } from "@/lib/aiChatAccess";

export default function TooltipNavbar() {
  const { isAuthenticated, user, setIsAuthenticated, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

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
  const canUseAiChat = hasAiChatAccess(user?.email);

  const trackNavClick = (event: string, target: string) => {
    void trackAnalyticsEvent({
      event,
      source: "tooltip_navbar",
      page: "navigation",
      metadata: { target },
    });
  };

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
    const longHandle = window.setTimeout(() => setRouteLong(true), 600);
    const handle = window.setTimeout(() => setRouteLoading(false), 180);
    return () => {
      window.clearTimeout(handle);
      window.clearTimeout(longHandle);
    };
  }, [pathname]);

  const handleSignOut = async () => {
    trackNavClick("nav_sign_out_click", "sign_out");
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

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
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

  const totalUnread = useChatStore((s) => s.totalUnread);

  const createHref = user?.username ? `/channel/${user.username}` : "/channel";
  const sideItems = [
    { name: "Home", href: "/home", icon: House },
    { name: "Daily Problem", href: "/potd", icon: Flame },
    {
      name: "Messages",
      href: "/messages",
      icon: MessageCircle,
      badge: totalUnread,
    },

    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Create", href: createHref, icon: Plus },
    ...(canUseAiChat
      ? [{ name: "Flashcards", href: "/flashcards", icon: BookOpen }]
      : []),
    ...(isStaff ? [{ name: "Staff", href: "/staff", icon: ShieldUser }] : []),
    ...(isAdmin ? [{ name: "Admin", href: "/admin", icon: Hammer }] : []),
  ];

  const renderUserNav = () => {
    if (loading) {
      return (
        <div className="h-10 w-10 rounded-full bg-neutral-700 animate-pulse" />
      );
    }
    if (!isAuthenticated || !user) {
      return <div />;
    }
    return (
      <div className="flex items-center gap-4">
        <div
          className="hidden md:flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full"
          title="Current Streak"
        >
          <Flame
            className={`w-4 h-4 text-orange-500 ${streakActive ? "fill-orange-500" : "fill-transparent"}`}
          />
          <span className="text-sm font-bold text-orange-400">{streak}</span>
        </div>
        <NotificationBell />
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              trackNavClick(
                "nav_user_menu_toggle",
                dropdownOpen ? "close" : "open",
              );
              setDropdownOpen(!dropdownOpen);
            }}
            className="flex items-center gap-3 p-2 rounded-lg transition-colors group"
            aria-label="Toggle user menu"
          >
            <div className="text-left hidden lg:block">
              <h2 className="font-bold text-sm text-neutral-200">
                {user.displayName || user.username || ""}
              </h2>
            </div>
            <div className="relative">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="h-10 w-10 rounded-full object-cover border border-neutral-700"
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
            <div className="text-neutral-400 group-hover:text-white transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`w-5 h-5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
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
            <div className="absolute right-0 mt-2 w-48 bg-neutral-950 border border-neutral-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="md:hidden px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                <span className="text-neutral-400 text-sm">Streak</span>
                <div className="flex items-center gap-1.5 text-orange-400 font-bold">
                  <Flame
                    className={`w-4 h-4 text-orange-500 ${streakActive ? "fill-orange-500" : "fill-transparent"}`}
                  />
                  {streak}
                </div>
              </div>
              {user?.username && (
                <Link href={`/profile/${user.username}`}>
                  <span
                    className="block px-4 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors"
                    onClick={() => {
                      trackNavClick("nav_menu_link_click", "profile");
                      setDropdownOpen(false);
                    }}
                  >
                    Profile
                  </span>
                </Link>
              )}
              <Link
                href={user?.username ? `/channel/${user.username}` : "/channel"}
              >
                <span
                  className="block px-4 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors"
                  onClick={() => {
                    trackNavClick("nav_menu_link_click", "channel");
                    setDropdownOpen(false);
                  }}
                >
                  Channel
                </span>
              </Link>
              <Link href="/settings">
                <span
                  className="block px-4 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors"
                  onClick={() => {
                    trackNavClick("nav_menu_link_click", "settings");
                    setDropdownOpen(false);
                  }}
                >
                  Settings
                </span>
              </Link>
              {isStaff && (
                <Link href="/staff">
                  <span
                    className="block px-4 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors"
                    onClick={() => {
                      trackNavClick("nav_menu_link_click", "staff");
                      setDropdownOpen(false);
                    }}
                  >
                    Staff
                  </span>
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin">
                  <span
                    className="block px-4 py-3 text-sm text-neutral-300 hover:text-white hover:bg-neutral-900 cursor-pointer transition-colors"
                    onClick={() => {
                      trackNavClick("nav_menu_link_click", "admin");
                      setDropdownOpen(false);
                    }}
                  >
                    Admin
                  </span>
                </Link>
              )}
              <div className="border-t border-neutral-800 mt-1">
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
        className={`route-progress-bar ${routeLoading ? "is-active" : ""} ${routeLong ? "is-long" : ""}`}
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
            <Link
              href="/"
              onClick={() => trackNavClick("nav_logo_click", "home_logo")}
              className="flex items-center space-x-2 group"
            >
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
        className="
    fixed z-40 pointer-events-none
    /* Mobile: bottom horizontal bar */
    bottom-0 left-0 right-0
    /* Desktop: left vertical rail */
    md:bottom-auto md:right-auto md:left-0 md:top-16 md:h-[calc(100%-4rem)]
    md:flex md:items-center md:-translate-y-8
  "
      >
        <div
          className="
      pointer-events-auto
      /* Mobile: full-width row, safe-area padding for iPhone home indicator */
      flex flex-row items-center justify-around
      px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]
      bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800
      /* Desktop: revert to vertical column with no bg */
      md:flex-col md:justify-start md:gap-0 md:py-6 md:px-0 md:ml-2
      md:bg-transparent md:backdrop-blur-none md:border-t-0
    "
        >
          {sideItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-label={item.name}
                onClick={() => trackNavClick("nav_side_link_click", item.href)}
                className="group/tip relative w-14 h-14 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all duration-150"
              >
                <span
                  className={`absolute inset-0 rounded-full bg-white/20 scale-75 opacity-0 transition-all duration-150 group-hover/tip:scale-100 group-hover/tip:opacity-100 ${
                    isActive ? "scale-100 opacity-30" : ""
                  }`}
                />
                <item.icon
                  size={26}
                  className={`relative z-10 ${isActive ? "text-white fill-white" : ""}`}
                />
                {item.badge > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums z-20">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
                {/* Tooltip callout — desktop only */}
                <span className="hidden md:block pointer-events-none absolute left-full ml-3 px-2.5 py-1 rounded-md bg-neutral-800 border border-neutral-700 text-white text-xs font-medium whitespace-nowrap opacity-0 -translate-x-1 group-hover/tip:opacity-100 group-hover/tip:translate-x-0 transition-all duration-150 shadow-lg">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
