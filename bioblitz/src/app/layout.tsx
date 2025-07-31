import "./globals.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
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
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <html lang="en">
        <body>
          {user ? <MainNavbar /> : <MarketingNavbar />}
          {children}
        </body>
      </html>
    </GoogleOAuthProvider>
  );
}