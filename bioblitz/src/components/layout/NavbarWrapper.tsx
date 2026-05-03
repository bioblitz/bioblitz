"use client";

import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import TooltipNavbar from "./TooltipNavbar";
import MarketingNavbar from "./MarketingNavbar";

export default function NavbarWrapper() {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const SkeletonNavbar = (
    <div className="fixed w-full h-16 bg-neutral-900 z-50 border-b border-zinc-800" />
  );

  if (!mounted || loading) {
    return SkeletonNavbar;
  }

  if (pathname === "/") {
    return <MarketingNavbar />;
  }

  return isAuthenticated ? <TooltipNavbar /> : <MarketingNavbar />;
}
