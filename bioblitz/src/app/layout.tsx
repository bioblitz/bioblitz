import "./globals.css";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import { UsernameChecker } from "@/components/auth/UsernameChecker";
import ActivityTracker from "../components/ActivityTracker";
import { SITE_URL } from "@/lib/site-url";

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
  title: "BioBlitz | Competitive Biology Platform",
  description:
    "BioBlitz is a competitive biology platform for training, tracking, and improving performance in biology competitions.",
  icons: {
    icon: "/icons/favicon.ico",
    shortcut: "/icons/favicon.ico",
  },
  openGraph: {
    title: "BioBlitz | Competitive Biology Platform",
    description:
      "BioBlitz is a competitive biology platform for training, tracking, and improving performance in biology competitions.",
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/images/BIOBLITZ.png`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BioBlitz | Competitive Biology Platform",
    description:
      "BioBlitz is a competitive biology platform for training, tracking, and improving performance in biology competitions.",
    images: [`${SITE_URL}/images/BIOBLITZ.png`],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.className} ${instrumentSerif.variable}`}>
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
