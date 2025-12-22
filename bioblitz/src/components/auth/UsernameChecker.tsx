"use client";

import { useAuth } from "@/context/AuthContext";
import { UsernamePopup } from "./UsernamePopup";

export function UsernameChecker() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user && !user.username) {
    return <UsernamePopup />;
  }

  return null;
}