import type { Metadata } from 'next';
import React from 'react';

// Optional: Add metadata that will apply to all pages within this layout
export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Login or create an account to continue.',
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
    <main className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        {/* The content from your page.tsx files (e.g., the login form) will be rendered here */}
        {children}
      </div>
    </main>
  );
}