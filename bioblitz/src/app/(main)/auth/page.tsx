"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { app } from "@/lib/firebase";
import { createUserProfile } from "@/lib/user";
import { markMarketingPopupForNextSignIn } from "@/hooks/useMarketingPopup";
import { trackAnalyticsEvent } from "@/lib/analytics-client";
import GoogleButton from "@/components/ui/GoogleButton";
import { useAuth } from "@/context/AuthContext";
import { Trophy, Timer, BookOpen, LucideIcon } from "lucide-react";

export default function AuthenticationPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth(app);
  const {
    isAuthenticated,
    loading: authLoading,
  } = useAuth();
  const provider = new GoogleAuthProvider();
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/home");
    }
  }, [authLoading, isAuthenticated, router]);
  const handleClick = async () => {
    void trackAnalyticsEvent({
      event: "auth_google_click",
      source: "auth_page_google_button",
      page: "auth",
    });

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
<<<<<<< HEAD
        await createUserProfile(user);
=======
        const profile = await createUserProfile(user);
        void trackAnalyticsEvent({
          event: "auth_google_success",
          source: "auth_page_google_button",
          page: "auth",
          metadata: {
            isNewUser: profile?.username ? false : true,
          },
        });
        setIsAuthenticated(true);
        if (profile?.marketingConsent !== true) {
          markMarketingPopupForNextSignIn();
        }
>>>>>>> 07b5bb7af40c33be037d02e2645454d5a14adb03
        window.location.assign("/home");
      } else {
        console.error("Failed to create session:", await res.json());
        setLoading(false);
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "auth/popup-closed-by-user"
      ) {
        void trackAnalyticsEvent({
          event: "auth_google_popup_closed",
          source: "auth_page_google_button",
          page: "auth",
        });
        setLoading(false);
        return;
      }

      console.error("Error during sign-in:", error);
      setLoading(false);
    }
  };

  const FeatureItem = ({
    icon: Icon,
    title,
    description,
  }: {
    icon: LucideIcon;
    title: string;
    description: string;
  }) => (
    <div className="flex items-start space-x-4">
      <div className="bg-[#0F1422] p-2 rounded-lg shrink-0">
        <Icon className="w-5 h-5 text-yellow-400" />
      </div>
      <div>
        <h3 className="text-white font-medium text-sm">{title}</h3>
        <p className="text-zinc-400 text-xs leading-relaxed">{description}</p>
      </div>
    </div>
  );

  if (!authLoading && isAuthenticated) {
    return null;
  }
  return (
    <div className="min-h-screen w-full bg-neutral-900 text-white flex items-center justify-center relative overflow-hidden font-sans p-4">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none  bg-[size:24px_24px]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neutral-900 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-4xl">
        <div className="bg-neutral-900 backdrop-blur-xl rounded-3xl border border-neutral-800 overflow-hidden">
          {" "}
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-5 md:p-8 flex flex-col justify-center md:border-r border-neutral-500 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-neutral-600/5 pointer-events-none z-0"></div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">
                  Master Biology, <br />
                  <div className="text-3x1 font-bold tracking-tight mb-4 text-white">
                    {" "}
                    One Blitz at a Time.
                  </div>
                </h2>
                <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                  Join the fastest-growing community of biology enthusiasts.
                  Compete in real-time, track your progress, and climb the
                  global leaderboard.
                </p>

                <div className="space-y-6">
                  <FeatureItem
                    icon={Trophy}
                    title="Competitive Ladders"
                    description="Climb the ranks and raise your Elo rating to prove your mastery."
                  />
                  <FeatureItem
                    icon={Timer}
                    title="Real-Time Battles"
                    description="Race against the clock in intense, timed biology challenges."
                  />
                  <FeatureItem
                    icon={BookOpen}
                    title="Diverse Topics"
                    description="Test your knowledge across Genetics, Cell Bio, Biochemistry, and more."
                  />
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12 flex flex-col justify-center bg-zinc-900/30">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Sign in to your account
                </h3>
                <p className="text-zinc-400 text-sm">
                  Start your journey today.
                </p>
              </div>

              <div className="space-y-6">
                <div className="w-full flex justify-center transition-transform hover:scale-[1.01] active:scale-[0.99]">
                  <GoogleButton onClick={handleClick} disabled={loading} />
                </div>

                <div className="relative flex items-center py-0">
                  <div className="grow border-t border-white/10"></div>
                  <span className="shrink-0 mx-4 text-xs text-slate-500 uppercase tracking-widest">
                    Secure Login
                  </span>
                  <div className="grow border-t border-white/10"></div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <p className="text-xs text-slate-500 leading-relaxed px-4">
                  By continuing, you agree to our{" "}
                  <a
                    href="/terms-and-conditions"
                    className="underline hover:text-yellow-400 transition-colors"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy-policy"
                    className="underline hover:text-yellow-400 transition-colors"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-50 bg-neutral-900/70 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-neutral-900/80 p-6 rounded-2xl flex flex-col items-center border border-neutral-700">
            <div className="w-10 h-10 border-[3px] border-neutral-700 border-t-neutral-400 rounded-full animate-spin mb-4" />
            <p className="text-neutral-400 font-medium tracking-wider">
              Authenticating...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
