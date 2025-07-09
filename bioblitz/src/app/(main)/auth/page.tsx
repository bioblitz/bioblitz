'use client'; // Required for hooks

import { Button } from "@components/ui/button"
import { FcGoogle } from "react-icons/fc"; // Import the Google icon

import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

export default function AuthenticationPage() {

  

const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Login Success:', tokenResponse);
      // You can now send this token to your backend for verification
    },
    onError: (error) => {
      console.error('Login Failed:', error);
    },
  });

  return (
    

    <div className="flex items-center justify-center h-screen bg-gray-100">
     <button 
      className="
        flex           
        items-center  
        gap-2         
        px-4 py-2
        bg-white
        border border-gray-300
        rounded-lg
        font-semibold
        hover:bg-gray-50
      "
      onClick= {()=>login()}
    >
      <FcGoogle className="h-5 w-5 mr-10" />
      Google Login
    </button>
    </div>
  );
}