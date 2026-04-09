'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  MessageSquare, 
  Sparkles, 
  Share2, 
  ArrowLeft 
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Perfil', href: '/dashboard/settings/business', icon: Building2 },
    { name: 'WhatsApp', href: '/dashboard/settings/whatsapp', icon: MessageSquare },
    { name: 'IA Eliza', href: '/dashboard/settings/agents', icon: Sparkles },
    { name: 'Integrações', href: '/dashboard/settings/integrations', icon: Share2 },
  ];

  const isCatalog = pathname.includes('/catalog');
  const isSettingsRoot = pathname === '/dashboard/settings';
  
  // If we are in a sub-setting (e.g. /business), the back button goes to the Hub.
  // If we are at the Hub, it goes back to the Dashboard.
  const backLink = isSettingsRoot ? '/dashboard' : '/dashboard/settings';

  return (
    <div className="w-full min-h-screen bg-[#F2F2F7] flex flex-col font-sans antialiased">
      {/* Settings Header - Simplified silicon valley style */}
      {!isCatalog && (
        <header className="h-16 w-full sticky top-0 bg-[#F2F2F7]/80 backdrop-blur-lg z-40 border-b border-black/5">
          <div className="w-full max-w-lg h-full px-4 mx-auto flex items-center justify-between">
            {!isSettingsRoot && (
              <Link 
                href={backLink}
                className="flex items-center gap-1 text-[#007AFF] font-medium"
              >
                <ArrowLeft size={20} />
                <span>Voltar</span>
              </Link>
            )}
            <div className={`flex flex-col items-center flex-1 ${isSettingsRoot ? 'text-center' : ''}`}>
               {/* Small title for sticky header when scrolling, but we can also use it as main for subpages */}
               <h1 className="text-base font-semibold tracking-tight text-gray-900 leading-none">
                 {isSettingsRoot ? '' : (pathname.includes('/business') ? 'Perfil' : (pathname.includes('/integrations') ? 'Integrações' : (pathname.includes('/payments') ? 'Pagamentos' : 'Configurações')))}
               </h1>
            </div>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>
        </header>
      )}

      {/* Tabs removed in favor of central Settings Hub index */}

      {/* Settings Content */}
      <main className={`w-full max-w-lg mx-auto flex-1 ${isCatalog ? 'px-4 py-4' : 'px-4 pb-20'}`}>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
