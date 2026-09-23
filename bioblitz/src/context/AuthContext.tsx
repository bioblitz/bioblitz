"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { UserProfile, cacheUserPhotoURL } from "@/lib/user";
import { useChatStore } from "@/lib/chatStore";

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  user: UserProfile | null;
  updateUserPhoto: (photoURL: string) => void;
  updateUsername: (username: string) => void;
  loading: boolean;
  /**
   * Re-reads the server session. Needed after signing in somewhere that does
   * not reload the page: the provider only reacts to Firebase auth changes,
   * and the session cookie is minted a moment after those fire.
   */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isCachingPhoto = useRef(false);

  const syncFromFirebaseUser = useCallback(
    async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          useChatStore.getState().setCurrentUser(firebaseUser.uid);

          const res = await fetch("/api/auth-status");
          if (!res.ok) throw new Error("auth-status failed");
          const data = await res.json();

          if (data.isAuthenticated && data.user) {
            const serverUser = data.user;

            if (!serverUser.photoURL && firebaseUser.photoURL) {
              serverUser.photoURL = firebaseUser.photoURL as string;
            }

            setIsAuthenticated(true);
            setUser(serverUser);

            if (
              serverUser.photoURL &&
              !isCachingPhoto.current &&
              serverUser.photoURL.includes("googleusercontent.com") &&
              !serverUser.photoURL.includes("firebasestorage.googleapis.com")
            ) {
              isCachingPhoto.current = true;
              cacheUserPhotoURL(serverUser.uid, serverUser.photoURL)
                .then((cachedUrl) => {
                  if (cachedUrl) {
                    setUser((prev) =>
                      prev ? { ...prev, photoURL: cachedUrl } : prev,
                    );
                  }
                })
                .finally(() => {
                  isCachingPhoto.current = false;
                });
            }
          } else {
            // Firebase user exists but no valid server session.
            // Don't call /api/logout here — it races with /api/login during
            // sign-in and can wipe the session cookie that was just created.
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          useChatStore.getState().setCurrentUser(null);
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Failed to fetch auth status:", error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const auth = getAuth();

    // Wait for Firebase Auth to restore its state from IndexedDB before doing
    // anything. This fires once with the real auth state (no null-then-user
    // indeterminate period for cached sessions), so we never check
    // auth.currentUser synchronously, which was the race condition that caused
    // force-logouts on every page reload.
    const unsubscribe = onAuthStateChanged(auth, syncFromFirebaseUser);

    return () => unsubscribe();
  }, [syncFromFirebaseUser]);

  const refresh = useCallback(async () => {
    await syncFromFirebaseUser(getAuth().currentUser);
  }, [syncFromFirebaseUser]);

  const updateUserPhoto = (photoURL: string) => {
    if (user) setUser({ ...user, photoURL });
  };

  const updateUsername = (username: string) => {
    if (user) setUser({ ...user, username });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        user,
        updateUserPhoto,
        updateUsername,
        loading,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
