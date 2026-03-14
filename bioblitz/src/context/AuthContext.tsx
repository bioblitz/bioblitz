"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth } from "firebase/auth";
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/lib/user';

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  user: UserProfile | null;
  updateUserPhoto: (photoURL: string) => void;
  updateUsername: (username: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const res = await fetch('/api/auth-status');
        if (res.ok) {
          const data = await res.json();
          const auth = getAuth();
          const currentAuthUser = auth.currentUser;

          if (data.isAuthenticated && !currentAuthUser) {
            await fetch("/api/logout", { method: "POST" });
            setIsAuthenticated(false);
            setUser(null);
            return;
          }

          setIsAuthenticated(data.isAuthenticated);
          if (data.isAuthenticated) {
            // prefer server-provided user profile, but if it lacks a photoURL
            // fall back to Firebase Auth's currentUser.photoURL so the navbar
            // can show the user's pfp immediately
            const serverUser = data.user;

            if (serverUser) {
              if (!serverUser.photoURL && currentAuthUser?.photoURL) {
                serverUser.photoURL = currentAuthUser.photoURL as string;
              }
            }

            setUser(serverUser);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to fetch auth status:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const updateUserPhoto = (photoURL: string) => {
    if (user) {
      setUser({ ...user, photoURL });
    }
  };

  const updateUsername = (username: string) => {
    if (user) {
      setUser({ ...user, username });
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, user, updateUserPhoto, updateUsername, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
