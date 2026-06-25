'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Sparkles } from 'lucide-react';

import Link from 'next/link';

interface DashboardHeaderProps {
  userEmail: string;
}

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  const router = useRouter();

  useEffect(() => {
    console.log('[STOREFRONT_MOUNT] DashboardHeader mounted', { userEmail });
  }, [userEmail]);

  const handleSignOut = async () => {
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log('[AUTH_STATE] User logged out successfully');
      router.refresh();
      router.push('/login');
    } catch (err: any) {
      console.error('❌ [AUTH_ERROR] Sign out failure:', err.message);
    }
  };

  return (
    <header className="w-full bg-white border-b border-rose-100/60 sticky top-0 z-30 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100/40">
            <Sparkles size={16} className="fill-rose-50" />
          </div>
          <span className="text-md font-black text-rose-600 tracking-tight font-jakarta">
            Nails Panel
          </span>
        </Link>

        {/* User Stats & Logout */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-500">
            <User size={13} className="text-slate-400" />
            <span>{userEmail}</span>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100/80 text-rose-600 rounded-xl text-xs font-extrabold transition-all border border-rose-100 cursor-pointer"
          >
            <LogOut size={13} className="stroke-[2.5]" />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
