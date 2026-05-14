import "./globals.css";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import { UsernameChecker } from "@/components/auth/UsernameChecker";
import ActivityTracker from "../components/ActivityTracker";
import MarketingPopup from "@/components/auth/MarketingPopup";
import RouteAnalyticsTracker from "@/components/analytics/RouteAnalyticsTracker";
import { SITE_URL } from "@/lib/site-url";
import { Suspense } from "react";
import ChatSubscriber from "@/components/features/messages/ChatSubscriber";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "BioBlitz | Competitive Biology Platform",
    template: "%s | BioBlitz",
  },
  description:
    "BioBlitz is a free competitive biology platform for USABO, AP Biology, and MCAT prep. Race against the clock, earn an Elo rating, and climb the global leaderboard.",
  keywords: [
    "competitive biology platform",
    "bioblitz game",
    "USABO practice",
    "competitive biology",
    "AP biology practice",
    "biology olympiad",
    "biology competition",
    "MCAT biology",
    "biology flashcards",
    "biology elo rating",
  ],
  icons: {
    icon: "/icons/favicon.ico",
    shortcut: "/icons/favicon.ico",
  },
  openGraph: {
    title: "BioBlitz | Competitive Biology Platform",
    description:
      "Free competitive biology quiz game. Practice USABO, AP Bio, and MCAT questions, earn an Elo rating, and compete on a global leaderboard.",
    url: SITE_URL,
    siteName: "BioBlitz",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/images/BIOBLITZ.png`,
        width: 1200,
        height: 630,
        alt: "BioBlitz | Competitive Biology Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BioBlitz | Competitive Biology Platform",
    description:
      "Free competitive biology quiz game. Practice USABO, AP Bio, and MCAT questions, earn an Elo rating, and compete on a global leaderboard.",
    images: [`${SITE_URL}/images/BIOBLITZ.png`],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.className} ${instrumentSerif.variable}`}
      style={{ backgroundColor: "#171717" }}
    >
      <body>
        <AuthProvider>
          <ChatSubscriber />

          <ActivityTracker />
          <Suspense fallback={null}>
            <RouteAnalyticsTracker />
          </Suspense>
          <UsernameChecker />
          <MarketingPopup />
          <NavbarWrapper />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
