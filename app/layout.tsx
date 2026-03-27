/*
  app/layout.tsx
  Root layout — Inter font, light-mode foundation
*/

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-inter",
    display: 'swap',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://wolfagent.netlify.app'),
    title: "meatende.ai",
    description: "Um funcionário de IA que atende seu WhatsApp, qualifica clientes e agenda reuniões e até recebe pagamentos automaticamente. 24 horas por dia, 7 dias por semana.",
    openGraph: {
        title: "meatende.ai - Seu funcionário de IA",
        description: "Um funcionário de IA que atende seu WhatsApp, qualifica clientes e agenda reuniões e até recebe pagamentos automaticamente. 24 horas por dia, 7 dias por semana.",
        locale: 'pt_BR',
        type: 'website',
        images: [
            {
                url: 'https://wolfagent.netlify.app/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'meatende.ai',
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
                    "font-sans antialiased bg-slate-50 text-slate-900",
                    inter.variable
                )}
            >
                {children}
            </body>
        </html>
    );
}
