import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import { UsernameChecker } from "@/components/auth/UsernameChecker";
import ActivityTracker from "../components/ActivityTracker";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'BioBlitz | The Game for Competition Biology',
    template: '%s | BioBlitz',
  },
  description: 'Master the USABO and AP Biology through competitive gaming. Climb the leaderboard, solve past paper questions, and improve your biology rating.',
  keywords: ['USABO', 'Biology Olympiad', 'Biology Game', 'Competitive Biology', 'BioBlitz', 'Science Olympiad', 'Bio', 'Problem Sets', 'USABO Content', 'USABO Prep'],
  openGraph: {
    title: 'BioBlitz - Competitive Biology',
    description: 'Race against the clock and other students to master USABO content.',
    type: 'website',
    locale: 'en_US',
    url: 'https://bioblitz.net',
    siteName: 'BioBlitz',
  },
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ActivityTracker />
          <UsernameChecker />
          <NavbarWrapper />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}


