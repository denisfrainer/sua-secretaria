'use client';

import React from 'react';
import { Calendar, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

export function AgendaEmptyState() {
  const supabase = createClient();

  const handleConnectCalendar = async () => {
    console.log('🔄 [OAUTH] Triggering Google Calendar OAuth flow...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/agenda` 
      }
    });

    if (error) {
      console.error('❌ [OAUTH] Error during sign-in:', error.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px] animate-in fade-in zoom-in duration-700">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/10 blur-[60px] rounded-full" />
        <div className="relative w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border border-black/5">
          <Calendar size={40} className="text-blue-600" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <Plus size={14} className="text-white" strokeWidth={4} />
          </div>
        </div>
      </div>

      <div className="max-w-xs space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-2">
            Conecte sua Agenda
            <Sparkles size={20} className="text-blue-500" />
          </h2>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest leading-loose">
            Para gerenciar seus agendamentos e permitir que a IA marque horários, vincule sua conta do Google.
          </p>
        </div>

        <button
          onClick={handleConnectCalendar}
          className="w-full group relative flex items-center justify-center gap-3 py-4 bg-black text-white rounded-2xl shadow-xl shadow-black/10 text-sm font-black active:scale-[0.98] transition-all hover:bg-gray-900 uppercase tracking-wider"
        >
          <span>Conectar Google Agenda</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          Utilizamos a API oficial do Google com criptografia total.
        </p>
      </div>
    </div>
  );
}
