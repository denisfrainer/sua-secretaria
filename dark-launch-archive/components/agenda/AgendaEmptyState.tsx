'use client';

import React from 'react';
import { Calendar, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

export function AgendaEmptyState() {
  const supabase = createClient();

  const handleConnectCalendar = async () => {
    console.log('🔄 [OAUTH] Redirecting to native Google OAuth flow...');
    window.location.href = '/api/auth/google/login';
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
          className="w-full relative flex items-center justify-center gap-3 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl shadow-sm shadow-gray-100/50 text-sm font-black active:scale-[0.98] transition-all hover:bg-gray-50 hover:shadow-md group"
        >
          {/* GOOGLE 'G' LOGO (Official Proportions) */}
          <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0 transition-transform group-hover:scale-110">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="tracking-tight">Conectar a agenda do Google</span>
        </button>

        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
          Utilizamos a API oficial do Google com criptografia total.
        </p>
      </div>
    </div>
  );
}
