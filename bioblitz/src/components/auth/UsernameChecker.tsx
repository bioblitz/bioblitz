"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { UsernamePopup } from "./UsernamePopup";

/**
 * Decides which shape of onboarding, if any, an account still owes.
 *
 * On a live route the only thing asked for is a username, because a room is
 * waiting on the other side of it and the lobby needs a name to show. The tour
 * and the email question are deferred — `onboardingPending` marks the debt —
 * and collected the next time the person is somewhere that is not a live
 * blitz.
 */
export function UsernameChecker() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [completed, setCompleted] = useState(false);

  if (loading || completed) {
    return null;
  }
  if (!user) {
    return null;
  }

  const onLiveRoute = pathname?.startsWith("/live") ?? false;

  if (!user.username) {
    return (
      <UsernamePopup
        mode={onLiveRoute ? "username" : "full"}
        onComplete={() => setCompleted(true)}
      />
    );
  }

  if (user.onboardingPending && !onLiveRoute) {
    return (
      <UsernamePopup mode="intro" onComplete={() => setCompleted(true)} />
    );
  }

  return null;
}
