"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, User, X } from "lucide-react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  getFirestore,
  deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { AppNotification } from "@/lib/notifications";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [validNotificationIds, setValidNotificationIds] = useState<Set<string>>(new Set());
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "notifications"),
      where("recipientUid", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(30),
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data = snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as AppNotification,
      );

      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
      
      // Initial validation for new notifications
      const newValidIds = new Set(validNotificationIds);
      for (const n of data) {
        if (!newValidIds.has(n.id)) {
          const isValid = await checkLinkValidity(n.link);
          if (isValid) {
            newValidIds.add(n.id);
            setValidNotificationIds(new Set(newValidIds));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [currentUser, db]);

  const checkLinkValidity = async (link: string): Promise<boolean> => {
    if (!link || link.trim() === "") return true;
    try {
      const blitzMatch = link.match(/^\/home\/([^/]+)$/);
      if (blitzMatch) {
        const gameId = blitzMatch[1];
        const snap = await getDoc(doc(db, "sets", gameId));
        return snap.exists();
      }

      const profileMatch = link.match(/^\/profile\/([^/]+)$/);
      if (profileMatch) {
        const username = profileMatch[1];
        const q = query(
          collection(db, "users"),
          where("username", "==", username),
          limit(1),
        );
        const snap = await getDocs(q);
        return !snap.empty;
      }
      return true;
    } catch {
      return true;
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);

    if (!isOpen && unreadCount > 0) {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          const ref = doc(db, "notifications", n.id);
          batch.update(ref, { read: true });
        }
      });
      await batch.commit();
    }
  };

  const dismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "notifications", id));
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const clearAllNonActionable = async () => {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      if (n.type !== "friend_request") {
        batch.delete(doc(db, "notifications", n.id));
      }
    });
    await batch.commit();
  };

  const handleNotificationClick = async (link: string) => {
    setIsOpen(false);
    if (!link || link.trim() === "") return;
    router.push(link);
  };

  if (!currentUser) return null;

  const visibleNotifications = notifications.filter(n => !n.link || validNotificationIds.has(n.id));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black"></span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-85 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
            <h3 className="font-semibold text-sm text-white">Notifications</h3>
            <div className="flex items-center gap-3">
              {visibleNotifications.some(n => n.type !== "friend_request") && (
                <button 
                  onClick={clearAllNonActionable}
                  className="text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider"
                >
                  Clear All
                </button>
              )}
              {unreadCount > 0 && (
                <span className="text-xs text-neutral-400 font-medium bg-neutral-800 px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {visibleNotifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              visibleNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() =>
                    notification.link &&
                    handleNotificationClick(notification.link)
                  }
                  className={`
                    relative p-4 border-b border-zinc-800/50 group ${notification.link ? "cursor-pointer" : "cursor-default"} transition-colors flex gap-3
                    ${
                      notification.read
                        ? "bg-transparent hover:bg-zinc-900/50"
                        : "bg-neutral-500/5 hover:bg-neutral-500/10"
                    }
                  `}
                >
                  {/* Icon / Avatar */}
                  <div className="shrink-0 mt-1">
                    {notification.senderPhotoURL ? (
                      <img
                        src={notification.senderPhotoURL}
                        alt="User"
                        className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.onerror = null;
                          target.src = "/images/logo.svg";
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-zinc-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5 pr-4">
                      <p
                        className={`text-sm truncate ${
                          notification.read
                            ? "text-zinc-300"
                            : "text-white font-semibold"
                        }`}
                      >
                        {notification.title}
                      </p>
                      <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2 mt-0.5">
                        {notification.createdAt
                          ? new Date(
                              notification.createdAt.seconds * 1000,
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : "Just now"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                  </div>

                  {/* Dismiss Button */}
                  <button
                    onClick={(e) => dismissNotification(e, notification.id)}
                    className="absolute right-2 top-4 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>

                  {!notification.read && (
                    <div className="shrink-0 self-center pr-1">
                      <div className="w-2 h-2 rounded-full bg-neutral-500"></div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
