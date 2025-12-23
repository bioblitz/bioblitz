"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { app } from "@/lib/firebase";
import { createUserProfile } from "@/lib/user";
import GoogleButton from "@/components/ui/GoogleButton";
import { useAuth } from "@/context/AuthContext";
import { Zap, Loader2, ArrowRight } from "lucide-react";

export default function AuthenticationPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth(app);
  const { setIsAuthenticated } = useAuth();
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
        setIsAuthenticated(true);
        window.location.assign("/home");
      } else {
        console.error("Failed to create session:", await res.json());
        setLoading(false);
      }
    } catch (error) {
      console.error("Error during sign-in:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950  text-white flex items-center justify-center relative overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-indigo-950/60 border border-indigo-900/40 backdrop-blur-xl rounded-2xl p-8 shadow-xl hover:shadow-lg hover:shadow-indigo-800/50 transition-shadow duration-300">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-6">
              <div
                className="bg-yellow-400/10 p-1.5 rounded-full
                transition-all duration-300 ease-out
                hover:bg-yellow-400/20
                hover:scale-110  translate-y-[15px]
                hover:shadow-[0_0_18px_rgba(250,204,21,0.45)]"
              >
                <Zap
                  className="w-6 h-6 text-yellow-400 
                  transition-transform duration-300 ease-out
                  hover:scale-105"
                />
              </div>
            </div>

            <h1 className="text-3xl font-bold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
              Welcome to BioBlitz
            </h1>
            <p className="text-zinc-400 text-sm">
              Sign in to track your progress and compete.
            </p>
          </div>

          <div className="space-y-4">
            <div className="w-full flex justify-end pr-9.5 transition-transform hover:scale-[1.01] active:scale-[0.99]">
              <GoogleButton onClick={handleClick} disabled={loading} />
            </div>
            <div className="relative flex items-center py-2">
              <div className="grow border-t border-white/10"></div>
              <span className="shrink-0 mx-4 text-xs text-slate-500 uppercase tracking-widest">
                Secure Login
              </span>
              <div className="grow border-t border-white/10"></div>
            </div>
          </div>

          <div className="mt-1 text-center">
            <p className="text-xs text-slate-500">
              By continuing, you agree to our{" "}
              <a
                href="/terms-of-service"
                className="underline hover:text-indigo-400 transition-colors"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                href="/privacy-policy"
                className="underline hover:text-indigo-400 transition-colors"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-white font-medium animate-pulse">
            Authenticating...
          </p>
        </div>
      )}
    </div>
  );
}
