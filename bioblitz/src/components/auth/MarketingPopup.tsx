"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import MarketingEmails from "@/components/forms/MarketingEmails";
import { useMarketingPopup } from "@/hooks/useMarketingPopup";

export default function MarketingPopup() {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const { showModal, handleAccept, handleDecline } = useMarketingPopup({ user });

    if (loading) return null;
    if (!user) return null;

    // Onboarding asks this question itself and writes the same preference, so
    // while any of it is outstanding this would stack a second modal on top
    // and ask twice. `onboardingPending` is the deferred half owed by someone
    // who signed in from a live invite link.
    if (!user.username || user.onboardingPending) return null;

    // A live blitz is someone else's clock running. Nothing gets to interrupt
    // it — and someone who arrived on a /live/<code> invite link is mid-join,
    // not visiting the site. The question keeps until their next normal visit.
    if (pathname?.startsWith("/live")) return null;

    if (!showModal) return null;

    return <MarketingEmails onAccept={handleAccept} onDecline={handleDecline} />;
}
