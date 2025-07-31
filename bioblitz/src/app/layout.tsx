import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import MainNavbar from "@/components/layout/MainNavbar";
import MarketingNavbar from "@/components/layout/MarketingNavbar";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        {user ? <MainNavbar /> : <MarketingNavbar />}
        {children}
      </body>
    </html>
  );
}