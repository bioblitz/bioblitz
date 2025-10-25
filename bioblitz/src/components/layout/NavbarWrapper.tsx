"use client";

import { useAuth } from "@/context/AuthContext";
import MainNavbar from "./MainNavbar";
import MarketingNavbar from "./MarketingNavbar";

export default function NavbarWrapper() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return isAuthenticated ? <MainNavbar /> : <MarketingNavbar />;
}
