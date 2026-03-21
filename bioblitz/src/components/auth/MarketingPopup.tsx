"use client";

import { useAuth } from "@/context/AuthContext";
import MarketingEmails from "@/components/forms/MarketingEmails";
import { useMarketingPopup } from "@/hooks/useMarketingPopup"
export default function MarketingPopup() {
    
    const { user, loading} = useAuth();

    if(loading) return null;
    if(!user || user ==null) return null;
    const { showModal, handleAccept, handleDecline } = useMarketingPopup(user);


    return showModal && 
}