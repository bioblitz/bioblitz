"use client"; // Required for hooks
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { app } from "@/lib/firebase"; 
import { createUserProfile } from "@/lib/user";
import GoogleButton from "@/components/ui/GoogleButton";
import { useAuth } from "@/context/AuthContext";

export default function AuthenticationPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth(app);
  const { setIsAuthenticated } = useAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const provider = new GoogleAuthProvider();

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const idToken = await user.getIdToken();

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        await createUserProfile(user);
        setIsAuthenticated(true); // Update AuthContext
        router.push("/home?justLoggedIn=true");
      } else {
        console.error("Failed to create session:", await res.json());
        setLoading(false);
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className = "text-white font-bold text-2xl">Loading...</div>;
  }

  return <GoogleButton onClick={handleClick} disabled={loading} />;
}
