import type { Metadata, Viewport } from "next";
import { Outfit, Source_Sans_3, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { GoogleTagManager } from '@next/third-parties/google'
import PwaRegistry from './components/PwaRegistry';

const outfit = Outfit({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: "--font-outfit",
    display: 'swap',
});

const sourceSans = Source_Sans_3({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: "--font-source-sans",
    display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-space-grotesk",
    display: 'swap',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://meatendeai.netlify.app'),
    title: "meatende.ai",
    description: "Um funcionário de IA que atende seu WhatsApp, qualifica clientes e agenda reuniões e até recebe pagamentos automaticamente. 24 horas por dia, 7 dias por semana.",
    openGraph: {
        title: "meatende.ai - Seu funcionário de IA",
        description: "Um funcionário de IA que atende seu WhatsApp, qualifica clientes e agenda reuniões e até recebe pagamentos automaticamente. 24 horas por dia, 7 dias por semana.",
        locale: 'pt_BR',
        type: 'website',
        images: [
            {
                url: 'https://meatendeai.netlify.app/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'meatende.ai',
            },
        ],
    },
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'meatende.ai',
    },
};

export const viewport: Viewport = {
    themeColor: '#2563EB',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="pt">
            <head>
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body
                className={cn(
                    "antialiased bg-white text-black font-outfit",
                    outfit.variable
                )}
            >
                <PwaRegistry />
                {children}
                <GoogleTagManager gtmId="GTM-TNPWHLB8" />
            </body>
        </html>
    );
}
