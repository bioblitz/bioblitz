import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase"

interface useMarketingPopup{
    user: object;
}
export function useMarketingPopup({user} : useMarketingPopup) {
    const [showModal, setShowModel] = useState(false);

    useEffect(() => {
        if(!user) return;
        async function check(){
            
        }

    });

}

