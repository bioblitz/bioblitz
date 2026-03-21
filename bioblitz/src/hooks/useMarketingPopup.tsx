import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp, getFirestore } from "firebase/firestore";
import { app } from "@/lib/firebase"
import { UserProfile } from "@/lib/user";


interface useMarketingPopup{
    user: UserProfile | null;
}
export function useMarketingPopup({user} : useMarketingPopup) {
    const [showModal, setShowModal] = useState(false);
    const db = getFirestore(app);
    
    useEffect(() => {
        if(!user?.uid) return;
        async function check(){
            const ref = doc(db, "users", user?.uid)
            const snap = await getDoc(ref);
            const data = snap.data();

            if(data?.marketingConsent == true){
                return;
            }
            if(!data?.marketingConsentAskedAt ){
                setShowModal(true);
                return;
            }
            const askedAt = data?.marketingConsentAskedAt.toDate();
            const daysSince = (Date.now() -askedAt) / (1000*60*60*24);
            if(daysSince >=30 ) setShowModal(true);
        }
        check();
    }, [user]);
    const handleAccept = async () => {
        await setDoc(doc(db, "users", user.uid),{
            marketingConsent: true,
            marketingConsentAskedAt: serverTimestamp(),
        }, {merge: true}
        );
        setShowModal(false);
    }
    const handleDecline = async () => {
        await setDoc(doc(db, "users", user.uid), {
            marketingConsent: false,
            marketingConsentAskedAt: serverTimestamp()
        }, {merge: true}
        );
        setShowModal(false);
    }
    return { showModal, handleAccept, handleDecline};
}

