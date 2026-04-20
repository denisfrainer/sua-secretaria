'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  MessageSquare, 
  Sparkles, 
  Share2, 
  ArrowLeft,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Perfil', href: '/dashboard/settings/profile', icon: User },
    { name: 'Estúdio', href: '/dashboard/settings/studio', icon: Building2 },
    { name: 'WhatsApp', href: '/dashboard/settings/whatsapp', icon: MessageSquare },
    { name: 'IA Eliza', href: '/dashboard/settings/agents', icon: Sparkles },
    { name: 'Integrações', href: '/dashboard/settings/integrations', icon: Share2 },
  ];

  const isCatalog = pathname.includes('/catalog');
  const isSettingsRoot = pathname === '/dashboard/settings';
  
  // High-focus pages that implement their own MinimalistHeader
  const isFocusPage = [
    '/dashboard/settings/booking-link',
    '/dashboard/settings/studio',
    '/dashboard/settings/whatsapp',
    '/dashboard/settings/catalog',
    '/dashboard/settings/agents'
  ].some(route => pathname.startsWith(route));
  
  // Back button always goes to the Dashboard as requested
  const backLink = '/dashboard';

  return (
    <div className="w-full min-h-screen bg-[#fafafa] flex flex-col font-source antialiased">
      {/* Settings Header - Simplified silicon valley style */}
      {!isCatalog && !isFocusPage && (
        <header className="h-20 w-full sticky top-0 bg-[#fafafa]/80 backdrop-blur-md z-40 border-b border-black/5">
          <div className="w-full max-w-3xl h-full px-6 mx-auto flex items-center gap-4">
            <Link 
              href={backLink}
              className="w-10 h-10 rounded-xl bg-white shadow-sm border border-black/5 flex items-center justify-center shrink-0 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={18} className="text-gray-900" />
            </Link>
            <div className="flex flex-col">
              <h1 className="text-lg font-black tracking-tight text-gray-900 leading-none">Configurações</h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                {isSettingsRoot ? 'Central de Ajustes' : 'Ajuste seu studio'}
              </p>
            </div>
          </div>
        </header>
      )}

      {/* Tabs removed in favor of central Settings Hub index */}

      {/* Settings Content */}
      <main className={`w-full max-w-3xl mx-auto flex-1 ${isCatalog ? 'px-6 py-6' : 'px-6 py-8'}`}>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
