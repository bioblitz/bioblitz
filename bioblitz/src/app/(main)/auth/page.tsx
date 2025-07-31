"use client"; // Required for hooks
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { app } from "@/lib/firebase"; 
import GoogleButton from "@/../components/ui/GoogleButton";

export default function AuthenticationPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const auth = getAuth(app);
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
        router.push("/home?justLoggedIn=true");
      } else {
        console.error("Failed to create session:", await res.json());
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
    } finally {
      setLoading(false);
    }
  };

  return <GoogleButton onClick={handleClick} disabled={loading} />;
}
