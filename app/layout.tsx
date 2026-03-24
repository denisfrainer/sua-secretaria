/*
  app/layout.tsx
  Root layout — provides <html> and <body> for ALL routes.
*/

import type { Metadata } from "next";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["700"],
    variable: "--font-space-grotesk",
    display: 'block',
});

const sourceSans = Source_Sans_3({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-source-sans",
    display: 'block',
});

export const metadata: Metadata = {
    metadataBase: new URL('http://localhost:3000'),
    title: "🐺 Wolf Agent",
    description: "A high-performance, i18n-ready starter kit for building blazing-fast websites with Next.js.",
    openGraph: {
        title: "Vibe Coder Boilerplate",
        description: "High-performance starter kit for Next.js websites",
        locale: 'en_US',
        type: 'website',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt">
            <body
                className={cn(
                    "font-sans antialiased bg-black text-white",
                    spaceGrotesk.variable,
                    sourceSans.variable
                )}
            >
                {children}
            </body>
        </html>
    );
}
