import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { GoogleTagManager } from '@next/third-parties/google'
import PwaRegistry from './components/PwaRegistry';



const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: "--font-inter",
    display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-jakarta",
    display: 'swap',
});



export const metadata: Metadata = {
    metadataBase: new URL('https://vitrine-manicure.netlify.app'),
    title: "Roleta Vantajosa",
    description: "A forma divertida de atrair clientes e vender mais",
    openGraph: {
        title: "Roleta Vantajosa",
        description: "A forma divertida de atrair clientes e vender mais",
        locale: 'pt_BR',
        type: 'website',
        images: [
            {
                url: 'https://vitrine-manicure.netlify.app/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'Roleta Vantajosa',
            },
        ],
    },
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'Roleta Vantajosa',
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
                    inter.variable,
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
