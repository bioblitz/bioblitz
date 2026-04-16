"use client";

import { useAuth } from "@/context/AuthContext";
import MarketingEmails from "@/components/forms/MarketingEmails";
import { useMarketingPopup } from "@/hooks/useMarketingPopup";

export default function MarketingPopup() {
    const { user, loading } = useAuth();
    const { showModal, handleAccept, handleDecline } = useMarketingPopup({
        user,
        checkNextSignInFlag: true,
    });

    if (loading) return null;
    if (!user) return null;
    if (!showModal) return null;

    return <MarketingEmails onAccept={handleAccept} onDecline={handleDecline} />;
}