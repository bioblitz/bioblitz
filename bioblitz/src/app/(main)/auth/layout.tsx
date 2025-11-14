import type { Metadata } from "next";
import React from "react";


export const metadata: Metadata = {
  title: "Authentication",
  description: "Login or create an account to continue.",
};


export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex items-center justify-center min-h-screen text-white bg-black">

        {children}
      </main>

    
  );
}
