import "./globals.css"; // Make sure this line is here
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <html lang="en">
        <body>
          {/*We will put the navbar here when deepak is finished with making it*/}
          {children}
        </body>
      </html>
    </GoogleOAuthProvider>
  );
}
