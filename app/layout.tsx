import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { GoogleTagManager } from '@next/third-parties/google'
import PwaRegistry from './components/PwaRegistry';



const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-jakarta",
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
                    "antialiased bg-white text-black font-jakarta",
                    jakarta.variable
                )}
            >
                <PwaRegistry />
                {children}
                <GoogleTagManager gtmId="GTM-TNPWHLB8" />
            </body>
        </html>
    );
}
