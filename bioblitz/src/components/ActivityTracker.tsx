"use client"; // 👈 This makes it work in the browser

import { useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { app } from "@/lib/firebase";

export default function ActivityTracker() {
  useEffect(() => {
    const auth = getAuth(app);
    const db = getFirestore(app);

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);

          await setDoc(
            userRef,
            {
              lastActive: serverTimestamp(),
              email: user.email,
            },
            { merge: true }
          );

          console.log("🕒 Activity tracked for:", user.email);
        } catch (e) {
          console.error("Error tracking activity:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
}
