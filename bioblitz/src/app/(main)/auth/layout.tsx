import type { Metadata } from "next";
import React from "react";
import VantaBackground from "@components/ui/VantaBackground";


// Optional: Add metadata that will apply to all pages within this layout
export const metadata: Metadata = {
  title: "Authentication",
  description: "Login or create an account to continue.",
};

/**
 * This is the shared layout for all authentication pages (e.g., /login, /signup).
 * It provides a consistent, centered container for the form content.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>      
    <VantaBackground />
    <main className="flex items-center justify-center min-h-screen text-white">

        {children}
      </main>
      </>

    
  );
}
