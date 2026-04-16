"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

function normalizePage(pathname: string): string {
  if (pathname === "/") return "landing";
  const normalized = pathname
    .replace(/^\/+/, "")
    .replace(/\//g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .toLowerCase();
  return normalized || "unknown";
}

export default function RouteAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedRouteRef = useRef<string>("");

  useEffect(() => {
    if (!pathname) return;

    const query = searchParams?.toString() || "";
    const routeKey = `${pathname}?${query}`;
    if (lastTrackedRouteRef.current === routeKey) return;

    lastTrackedRouteRef.current = routeKey;
    void trackAnalyticsEvent({
      event: "page_view",
      source: "route_analytics_tracker",
      page: normalizePage(pathname),
      metadata: {
        hasQuery: query.length > 0,
      },
    });
  }, [pathname, searchParams]);

  return null;
}
