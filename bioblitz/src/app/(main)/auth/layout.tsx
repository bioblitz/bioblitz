import type { Metadata } from "next";
import React from "react";

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
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black to-zinc-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-zinc-950/70 backdrop-blur-lg rounded-2xl shadow-xl border border-zinc-800">
        {children}
      </div>
    </main>
  );
}
