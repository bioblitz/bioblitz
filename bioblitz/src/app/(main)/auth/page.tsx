"use client"; // Required for hooks
import { useState, useEffect } from "react";
import { Button } from "@components/ui/button";
import { FcGoogle } from "react-icons/fc"; // Import the Google icon
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";
import GoogleButton from "@components/ui/GoogleButton"; // Import the custom Google button component


export default function AuthenticationPage() {
  const [isClicked, setIsClicked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [popPressed, setPopPressed] = useState(false);
  const [hideText, setHideText] = useState(false);
  const [dimScreen, setDimScreen] = useState(false);
  const router = useRouter();

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log("Login Success:", tokenResponse);
      setLoading(false);
      setSignedIn(true);
      setTimeout(() => {
        router.push("/home?justLoggedIn=true");
      }, 1000);
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


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black to-zinc-900 text-white space-y-8">
      {/* Press to sign in text at the top */}
      {dimScreen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity duration-700 z-10 pointer-events-none" />
      )}

   <GoogleButton onClick={handleClick}></GoogleButton>

    </div>
  );
}
