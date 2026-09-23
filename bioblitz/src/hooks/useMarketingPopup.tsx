import { useState, useEffect, useRef } from "react";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { UserProfile } from "@/lib/user";
import { updateMarketingPreference } from "@/lib/user";

const MARKETING_POPUP_LOCAL_STATE_KEY = "marketingPopupLocalState";

interface useMarketingPopup {
    user: UserProfile | null;
}

/**
 * The email-updates opt-in.
 *
 * It is asked **once per account, ever**. Whatever the answer is, it is the
 * answer: the only way it changes afterwards is the toggle in settings. A
 * popup that reappears on sign-in reads as the site ignoring a choice the
 * person already made, so there is deliberately no re-ask window, no
 * "next sign-in" flag and no decline cooldown here.
 *
 * The answer is recorded in two places. Firestore is authoritative, so the
 * question does not come back on a new device. localStorage is a fallback for
 * the case where that write fails — without it a failed write would mean the
 * popup returned on the very next page load.
 */
export function useMarketingPopup({ user }: useMarketingPopup) {
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
            }
        };

    useEffect(() => {
        if(!user?.uid) return;

        // An answer given in this session, before the profile read below has
        // caught up with it.
        if (readLocalState() !== null) return;

        const uid = user.uid;
        let cancelled = false;

        async function check(){
            let data: Record<string, unknown> | undefined;
            try {
            const ref = doc(db, "users", uid)
            const snap = await getDoc(ref);
                data = snap.data();
            } catch {
                // If the profile cannot be read there is no way to know whether
                // they have already answered. Staying quiet is the only choice
                // that cannot re-ask someone who already said no.
                return;
            }

            if (cancelled) return;

            const answered =
                typeof data?.marketingConsent === "boolean" ||
                data?.marketingConsentAskedAt != null;
            if (answered) return;

                setShowModal(true);
                if (!shownLoggedRef.current) {
                    shownLoggedRef.current = true;
                trackAnalytics("shown", "first_ask");
            }
        }
        check();
        return () => {
            cancelled = true;
        };
    }, [db, user]);

    // Both answers are final, so the modal closes even if persisting fails —
    // the local record still keeps it from coming straight back.
    const respond = async (consent: boolean) => {
        if (!user?.uid) return;
        writeLocalState(consent);
        setShowModal(false);
            try {
            await updateMarketingPreference(user.uid, consent, "popup");
        } catch (err) {
            console.error("Could not save marketing preference:", err);
        }
        await trackAnalytics(consent ? "accepted" : "declined");
    }

    const handleAccept = () => respond(true);
    const handleDecline = () => respond(false);

    return { showModal, handleAccept, handleDecline};
}
