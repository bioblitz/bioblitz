import { useState, useEffect, useRef } from "react";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { UserProfile } from "@/lib/user";
import { updateMarketingPreference } from "@/lib/user";

const NEXT_SIGN_IN_POPUP_KEY = "showMarketingPopupOnNextSignIn";
const MARKETING_POPUP_LOCAL_STATE_KEY = "marketingPopupLocalState";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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

        const readLocalState = () => {
            if (typeof window === "undefined") return null;
            try {
                const raw = window.localStorage.getItem(MARKETING_POPUP_LOCAL_STATE_KEY);
                if (!raw) return null;
                return JSON.parse(raw) as {
                    consent: boolean;
                    askedAt: number;
                };
            } catch {
                return null;
            }
        };

        const writeLocalState = (consent: boolean) => {
            if (typeof window === "undefined") return;
            try {
                window.localStorage.setItem(
                    MARKETING_POPUP_LOCAL_STATE_KEY,
                    JSON.stringify({ consent, askedAt: Date.now() })
                );
            } catch {
                // best-effort local fallback only
            }
        };

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
        const uid = user.uid;
        async function check(){
            const ref = doc(db, "users", uid)
            const snap = await getDoc(ref);
            const data = snap.data();

                        const forceShow =
                            checkNextSignInFlag &&
                            typeof window !== "undefined" &&
                            window.localStorage.getItem(NEXT_SIGN_IN_POPUP_KEY) === "1";

                        if(data?.marketingConsent === true){
                                writeLocalState(true);
                                if (typeof window !== "undefined") {
                                    window.localStorage.removeItem(NEXT_SIGN_IN_POPUP_KEY);
                                }
                return;
            }

            const askedAtMs = data?.marketingConsentAskedAt?.toDate?.()?.getTime?.() || null;
            const localState = readLocalState();
            const effectiveConsent =
                typeof data?.marketingConsent === "boolean"
                    ? data.marketingConsent
                    : localState?.consent;
            const effectiveAskedAt =
                askedAtMs || (typeof localState?.askedAt === "number" ? localState.askedAt : null);

            if (effectiveConsent === true) {
                if (typeof window !== "undefined") {
                    window.localStorage.removeItem(NEXT_SIGN_IN_POPUP_KEY);
                }
                return;
            }

            const shouldShowFirstAsk = effectiveAskedAt === null;
            const shouldShowDeclineCooldown =
                effectiveConsent === false &&
                effectiveAskedAt !== null &&
                Date.now() - effectiveAskedAt >= THIRTY_DAYS_MS;

            if (shouldShowFirstAsk || shouldShowDeclineCooldown) {
                setShowModal(true);
                if (!shownLoggedRef.current) {
                    shownLoggedRef.current = true;
                    trackAnalytics(
                        "shown",
                        shouldShowFirstAsk
                            ? forceShow
                                ? "next_sign_in_first_ask"
                                : "first_ask"
                            : forceShow
                                ? "next_sign_in_decline_30d"
                                : "decline_30d"
                    );
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
                await updateMarketingPreference(user.uid, true, "popup");
        writeLocalState(true);
        setShowModal(false);
    }

    const handleDecline = async () => {
        if (!user?.uid) return;
                await updateMarketingPreference(user.uid, false, "popup");
        writeLocalState(false);
        setShowModal(false);
    }
    return { showModal, handleAccept, handleDecline};
}

