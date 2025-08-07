import type { Metadata } from "next";
import React from "react";
import VantaBackground from "../../../components/ui/VantaBackground";


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
    <>      
    <VantaBackground />
    <main className="flex items-center justify-center min-h-screen text-white">

        {children}
      </main>
      </>

    
  );
}
