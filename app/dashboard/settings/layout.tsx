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

  return (
    <div className="w-full min-h-screen bg-[#fafafa] flex flex-col font-source antialiased">
      {/* Settings Header */}
      <header className="h-20 w-full sticky top-0 bg-[#fafafa]/80 backdrop-blur-md z-40 border-b border-black/5">
        <div className="w-full max-w-3xl h-full px-6 mx-auto flex items-center gap-4">
          <Link 
            href="/dashboard"
            className="w-10 h-10 rounded-xl bg-white shadow-sm border border-black/5 flex items-center justify-center shrink-0 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} className="text-black/80" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tight text-gray-900 leading-none">Configurações</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ajuste seu studio</p>
          </div>
        </div>
      </header>

      {/* Sub-navigation Tabs */}
      <div className="w-full bg-white border-b border-black/5 sticky top-20 z-30">
        <div className="w-full max-w-3xl px-4 mx-auto overflow-x-auto scrollbar-hide">
          <nav className="flex items-center gap-2 py-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap
                    ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}
                  `}
                >
                  <item.icon size={18} />
                  {item.name}
                  {isActive && (
                    <motion.div 
                      layoutId="active-tab"
                      className="absolute inset-0 bg-blue-50 rounded-xl -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Settings Content */}
      <main className="w-full max-w-3xl px-6 py-8 mx-auto flex-1">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
