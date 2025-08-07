import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import NavbarWrapper from "@/components/layout/NavbarWrapper";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <NavbarWrapper />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}