"use client"; // Required for hooks
import { useState, useEffect } from "react";
import { Button } from "@components/ui/button";
import { FcGoogle } from "react-icons/fc"; // Import the Google icon
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";

export default function AuthenticationPage() {
  const [isClicked, setIsClicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [popPressed, setPopPressed] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [dimScreen, setDimScreen] = useState(false);

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("Login Success:", tokenResponse);
      setLoading(false);
      setSignedIn(true);

      // You can now send this token to your backend for verification
    },
    onError: (error) => {
      console.error("Login Failed:", error);
      setLoading(false);
    },
  });

  const handleClick = () => {
    setIsClicked(true);
    setLoading(true);
    login();
    setTimeout(() => setIsClicked(false), 400);
  };

  useEffect(() => {
    if (signedIn) {
      setPopPressed(true);
      const timer = setTimeout(() => {
        setHideText(true); // hide after animation
        setDimScreen(true);
      }, 600); // duration of pop animation
      return () => clearTimeout(timer);
    }
  }, [signedIn]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black to-zinc-900 text-white space-y-8">
      {/* Press to sign in text at the top */}
      {dimScreen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity duration-700 z-10 pointer-events-none" />
      )}

      <div className="absolute top-30 left-4 w-full h-24 pointer-events-none z-30">
        <img
          src="/images/WelcomeToHeading.svg"
          alt="Welcome"
          className={`transition-opacity duration-[700ms] w-80 ease-out
      ${
        hideText && signedIn
          ? "translate-x-0 opacity-100"
          : "-translate-x-40 opacity-0"
      }
    `}
          style={{
            visibility: hideText && signedIn ? "visible" : "hidden",
            transitionDelay: hideText && signedIn ? "2000ms" : "0ms",
          }}
        />

        <img
          src="/images/BioblitzHeading.svg"
          alt="Bioblitz"
          className={`absolute top-52 right-32 w-56 h-auto transition-transform transition-opacity duration-1000 ease-out
    ${signedIn ? "translate-x-0 opacity-100" : "opacity-0"}`}
          style={{
            transitionDelay: signedIn ? "4000ms" : "0ms",
            transform: signedIn ? "translateX(0)" : "translateX(100vw)",
          }}
        />
      </div>

      <div
        className={`transition-opacity duration-700 ${
          dimScreen ? "opacity-0" : "opacity-100"
        }`}
      >
        <img
          src="/images/PressToSignIn.svg"
          alt="Press The Cell To Sign in"
          className={`h-16 w-200 transition-opacity duration-1000 ${
            popPressed ? "pop-away" : ""
          }`}
          style={{
            visibility: dimScreen ? "hidden" : "visible",
            opacity: dimScreen ? 0 : 1,
            height: "4rem",
            pointerEvents: dimScreen ? "none" : "auto",
          }}
        />
      </div>
      <div className="relative top-[-45px] left-[-12px] w-full h-[380px]">
        <img
          src="/images/cell.svg"
          alt="Cell"
          className={`absolute left-1/2 -translate-x-1/2 w-96 h-auto transition duration-2000 relative z-20 ${
            dimScreen
              ? "drop-shadow-[0_0_30px_rgba(0,0,255,0.9)] transition-delay-[700ms]"
              : ""
          }`}
          onClick={handleClick}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="loader h-8 w-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
}
