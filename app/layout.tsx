// app/layout.tsx
import "./globals.css";
import Navigation from "../components/Navigation";
import { Analytics } from "@vercel/analytics/react";
import { ReactNode } from "react";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BioQuest — AI-Powered VR Science Education',
  description: 'Create immersive VR classrooms in minutes with AI. No code required. Built for STEM educators.',
  metadataBase: new URL('https://bioquestxr.vercel.app'),
  openGraph: {
    title: 'BioQuest — AI-Powered VR Science Education',
    description: 'Create immersive VR classrooms in minutes with AI. No code required.',
    url: 'https://bioquestxr.vercel.app',
    siteName: 'BioQuest',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'BioQuest - AI-Powered VR Science Education' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BioQuest — AI-Powered VR Science Education',
    description: 'Create immersive VR classrooms in minutes with AI. No code required.',
    images: ['/og-image.png'],
  },
  icons: { icon: '/bio.png', apple: '/bio.png' },
};

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