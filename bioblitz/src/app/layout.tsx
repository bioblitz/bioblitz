import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavbarWrapper from "@/components/layout/NavbarWrapper";
import { UsernameChecker } from "@/components/auth/UsernameChecker";
import ActivityTracker from "../components/ActivityTracker";

export const metadata = {
  title: "BioBlitz",
  description: "...",
  icons: {
    icon: "/icons/favicon.svg",
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
