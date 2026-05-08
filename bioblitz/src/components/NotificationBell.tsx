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
import { trackAnalyticsEvent } from "@/lib/analytics-client";

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
    void trackAnalyticsEvent({
      event: "notification_bell_click",
      source: "notification_bell",
      page: "navigation",
      metadata: {
        opening: !isOpen,
        unreadCount,
      },
    });
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
    void trackAnalyticsEvent({
      event: "notification_load_more_click",
      source: "notification_panel",
      page: "navigation",
    });
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
    void trackAnalyticsEvent({
      event: "notification_dismiss_click",
      source: "notification_panel",
      page: "navigation",
    });
    try {
      await deleteDoc(doc(db, "notifications", id));
      setOlderNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const clearAll = async () => {
    void trackAnalyticsEvent({
      event: "notification_clear_all_click",
      source: "notification_panel",
      page: "navigation",
      metadata: { count: allNotifications.length },
    });
    const batch = writeBatch(db);
    allNotifications.forEach((n) => {
      batch.delete(doc(db, "notifications", n.id));
    });
    await batch.commit();
    setOlderNotifications([]);
  };

  const handleNotificationClick = (link: string) => {
    void trackAnalyticsEvent({
      event: "notification_item_click",
      source: "notification_panel",
      page: "navigation",
      metadata: {
        hasLink: Boolean(link),
      },
    });
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
        className="relative p-2 rounded-full hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-85 bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-3 border-b border-neutral-800 flex justify-between items-center bg-neutral-950/50">
            <h3 className="font-semibold text-sm text-white">Notifications</h3>
            <div className="flex items-center gap-3">
              {allNotifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] font-bold text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-wider"
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
              <div className="p-8 text-center text-neutral-500 text-sm">
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
                      relative p-4 border-b border-neutral-800/50 group ${notification.link ? "cursor-pointer" : "cursor-default"} transition-colors flex gap-3
                      ${notification.read ? "bg-transparent hover:bg-neutral-900/50" : "bg-neutral-500/5 hover:bg-neutral-500/10"}
                    `}
                  >
                    <div className="shrink-0 mt-1">
                      {notification.senderPhotoURL ? (
                        <img
                          src={notification.senderPhotoURL}
                          alt="User"
                          className="w-8 h-8 rounded-full object-cover border border-neutral-700"

                          onError={(e) => {
                            const target = e.currentTarget;
                            target.onerror = null;
                            target.src = "/images/logo.svg";
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
                          <User className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5 pr-6">
                        <p className={`text-sm ${notification.read ? "text-neutral-300" : "text-white font-semibold"}`}>
                          {notification.title}
                        </p>
                        <span className="text-[10px] text-neutral-500 whitespace-nowrap ml-2 mt-0.5 shrink-0">
                          {notification.createdAt
                            ? new Date(notification.createdAt.seconds * 1000).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            : "Just now"}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        {notification.message}
                      </p>
                    </div>

                    <button
                      onClick={(e) => dismissNotification(e, notification.id)}
                      className="absolute right-2 top-4 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-neutral-800 text-neutral-500 hover:text-white transition-all"
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
                    className="w-full py-3 text-xs text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
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
