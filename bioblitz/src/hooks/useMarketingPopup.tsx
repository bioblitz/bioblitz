import { useState, useEffect, useRef } from "react";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { UserProfile } from "@/lib/user";
import { updateMarketingPreference } from "@/lib/user";

const NEXT_SIGN_IN_POPUP_KEY = "showMarketingPopupOnNextSignIn";

interface useMarketingPopup {
    user: UserProfile | null;
    checkNextSignInFlag?: boolean;
}

export function markMarketingPopupForNextSignIn() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NEXT_SIGN_IN_POPUP_KEY, "1");
}

export function useMarketingPopup({ user, checkNextSignInFlag = false }: useMarketingPopup) {
    const [showModal, setShowModal] = useState(false);
    const db = getFirestore(app);
    const shownLoggedRef = useRef(false);
    const decidedRef = useRef(false);

        const trackAnalytics = async (
            event: "shown" | "accepted" | "declined",
            reason = "",
        ) => {
            try {
                await fetch("/api/analytics/marketing-consent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event, source: "popup", reason }),
                });
            } catch {
                // best-effort analytics only
            }
        };
    
    useEffect(() => {
        if(!user?.uid) return;
        async function check(){
            if (decidedRef.current) return;
            const ref = doc(db, "users", user?.uid)
            const snap = await getDoc(ref);
            const data = snap.data();

                        const forceShow =
                            checkNextSignInFlag &&
                            typeof window !== "undefined" &&
                            window.localStorage.getItem(NEXT_SIGN_IN_POPUP_KEY) === "1";

                        if(data?.marketingConsent === true){
                                if (typeof window !== "undefined") {
                                    window.localStorage.removeItem(NEXT_SIGN_IN_POPUP_KEY);
                                }
                return;
            }

            if(!data?.marketingConsentAskedAt ){
                setShowModal(true);
                                if (!shownLoggedRef.current) {
                                    shownLoggedRef.current = true;
                                    trackAnalytics("shown", forceShow ? "next_sign_in_first_ask" : "first_ask");
                                }
                                if (forceShow && typeof window !== "undefined") {
                                    window.localStorage.removeItem(NEXT_SIGN_IN_POPUP_KEY);
                                }
                return;
            }

            const askedAt = data?.marketingConsentAskedAt.toDate();
            const daysSince = (Date.now() -askedAt) / (1000*60*60*24);
                        if (daysSince >= 30) {
                            setShowModal(true);
                            if (!shownLoggedRef.current) {
                                shownLoggedRef.current = true;
                                trackAnalytics("shown", forceShow ? "next_sign_in_cooldown_met" : "cooldown_met");
                            }
                        }

                        if (forceShow && typeof window !== "undefined") {
                            window.localStorage.removeItem(NEXT_SIGN_IN_POPUP_KEY);
                        }
        }
        check();
    }, [checkNextSignInFlag, db, user]);

    const handleAccept = async () => {
        if (!user?.uid) return;
        decidedRef.current = true;
        setShowModal(false);
        await updateMarketingPreference(user.uid, true, "popup");
    }

    const handleDecline = async () => {
        if (!user?.uid) return;
        decidedRef.current = true;
        setShowModal(false);
        await updateMarketingPreference(user.uid, false, "popup");
    }
    return { showModal, handleAccept, handleDecline};
}

