// app/layout.tsx
import "./globals.css";
import Navigation from "../components/Navigation";
import { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Fonts - Origin.com inspired design */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white" suppressHydrationWarning>
        <Navigation />
        <main className="flex-1 relative overflow-hidden">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}