import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import { UsernameChecker } from "@/components/auth/UsernameChecker";
import ActivityTracker from "../components/ActivityTracker";

export const metadata = {
  title: "BioBlitz | Competitive Biology Platform",
  description:
    "BioBlitz is a competitive biology platform for training, tracking, and improving performance in biology competitions.",
  openGraph: {
    title: "BioBlitz | Competitive Biology Platform",
    description:
      "BioBlitz is a competitive biology platform for training, tracking, and improving performance in biology competitions.",
    url: "https://bioblitz.net",
    images: [
      {
        url: "https://bioblitz.net/images/BIOBLITZ.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BioBlitz | Competitive Biology Platform",
    description:
      "BioBlitz is a competitive biology platform for training, tracking, and improving performance in biology competitions.",
    images: ["https://bioblitz.net/images/BIOBLITZ.png"],
  },
};

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
