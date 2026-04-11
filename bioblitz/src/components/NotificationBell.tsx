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
  writeBatch,
  getFirestore,
  getDocs,
  startAfter,
  deleteDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import { AppNotification } from "@/lib/notifications";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [olderNotifications, setOlderNotifications] = useState<AppNotification[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AppNotification,
      );
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
      if (snapshot.docs.length === 30) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(true);
      } else {
        setLastDoc(null);
        setHasMore(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser, db]);

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

  const loadMore = async () => {
    if (!lastDoc || !currentUser || loadingMore) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "notifications"),
        where("recipientUid", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(30),
      );
      const snap = await getDocs(q);
      const newData = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AppNotification,
      );
      setOlderNotifications((prev) => [...prev, ...newData]);
      if (snap.docs.length === 30) {
        setLastDoc(snap.docs[snap.docs.length - 1]);
      } else {
        setLastDoc(null);
        setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const dismissNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "notifications", id));
      setOlderNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const clearAll = async () => {
    const batch = writeBatch(db);
    allNotifications.forEach((n) => {
      batch.delete(doc(db, "notifications", n.id));
    });
    await batch.commit();
    setOlderNotifications([]);
  };

  const handleNotificationClick = (link: string) => {
    setIsOpen(false);
    if (!link || link.trim() === "") return;
    router.push(link);
  };

  if (!currentUser) return null;

  const allNotifications = [...notifications, ...olderNotifications];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-85 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
            <h3 className="font-semibold text-sm text-white">Notifications</h3>
            <div className="flex items-center gap-3">
              {allNotifications.length > 0 && (
                <button
                  onClick={clearAll}
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

          <div className="max-h-[520px] overflow-y-auto custom-scrollbar">
            {allNotifications.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No notifications yet.
              </div>
            ) : (
              <>
                {allNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() =>
                      notification.link &&
                      handleNotificationClick(notification.link)
                    }
                    className={`
                      relative p-4 border-b border-zinc-800/50 group ${notification.link ? "cursor-pointer" : "cursor-default"} transition-colors flex gap-3
                      ${notification.read ? "bg-transparent hover:bg-zinc-900/50" : "bg-neutral-500/5 hover:bg-neutral-500/10"}
                    `}
                  >
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

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5 pr-6">
                        <p className={`text-sm ${notification.read ? "text-zinc-300" : "text-white font-semibold"}`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2 mt-0.5 shrink-0">
                          {notification.createdAt
                            ? new Date(notification.createdAt.seconds * 1000).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            : "Just now"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => dismissNotification(e, notification.id)}
                      className="absolute right-2 top-4 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {!notification.read && (
                      <div className="shrink-0 self-center pr-1">
                        <div className="w-2 h-2 rounded-full bg-neutral-500" />
                      </div>
                    )}
                  </div>
                ))}

                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full py-3 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
