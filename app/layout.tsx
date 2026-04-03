/*
  app/layout.tsx
  Root layout — Inter font, light-mode foundation
*/

import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { GoogleTagManager } from '@next/third-parties/google'
import PwaRegistry from './components/PwaRegistry';

const sourceSans3 = Source_Sans_3({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-source-sans",
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
    themeColor: '#2563EB',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'MeAtende',
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
                    "font-sans antialiased bg-white text-black",
                    sourceSans3.variable
                )}
            >
                <PwaRegistry />
                {children}
            </body>
            <GoogleTagManager gtmId="GTM-TNPWHLB8" />
        </html>
    );
}
