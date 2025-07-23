"use client"; // Required for hooks
import { useState, useEffect } from "react";
import { Button } from "@components/ui/button";
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

   <GoogleButton onClick={handleClick}/>

  );
}
