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
    metadataBase: new URL('https://wolfagent.netlify.app'),
    title: "Wolf Agents",
    description: "Automação de vendas com agentes de IA e Landing Pages ultravelozes. Transformamos sua operação digital em uma máquina de gerar leads qualificados 24/7.",
    openGraph: {
        title: "Wolf Agents",
        description: "Automação de vendas com agentes de IA e Landing Pages ultravelozes. Transformamos sua operação digital em uma máquina de gerar leads qualificados 24/7.",
        locale: 'pt_BR',
        type: 'website',
        images: [
            {
                url: 'https://wolfagent.netlify.app/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'Wolf Agency',
            },
        ],
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
