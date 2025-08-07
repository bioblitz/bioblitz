"use client";

import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // --- EDITED PART ---

      // We will perform two logout actions at the same time:
      // 1. Tell Firebase to sign the user out on the client.
      const firebaseSignOutPromise = signOut(auth);

      // 2. Tell our server to clear the HttpOnly session cookie.
      const serverSessionClearPromise = fetch('/api/logout', {
        method: 'POST',
      });

      // Wait for both actions to complete before proceeding.
      await Promise.all([firebaseSignOutPromise, serverSessionClearPromise]);

      // Redirect to the home page after both are done.
      router.push("/?potato=true");

    } catch (error) {
      console.error("Error during sign out: ", error);
      alert("Failed to sign out completely. Please try again.");
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="w-full mt-6 flex items-center justify-center gap-3 px-4 py-2.5 bg-red-600 text-white text-lg font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75 transition-colors duration-300"
    >
      <LogOut size={20} />
      <span>Sign Out</span>
    </button>
  );
}