'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Share2,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Loader2,
  ArrowLeft,
  Calendar as CalendarIcon
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { WhatsAppConnectionCard } from '@/components/dashboard/WhatsAppConnectionCard';

export default function IntegrationsSettingsPage() {
  const [profile, setProfile] = useState<{ google_refresh_token?: string | null; plan_tier?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const fetchIntegrationStatus = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchIntegrationStatus();
  }, [fetchIntegrationStatus]);

  const handleGoogleAuth = () => {
    const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard/settings/integrations`;
    window.location.href = '/api/auth/google';
  };

  const handleRevokeGoogle = async () => {
    setIsRevoking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ google_refresh_token: null })
        .eq('id', user.id);

      if (error) throw error;
      await fetchIntegrationStatus();
    } catch (err) {
      console.error('Failed to revoke Google access:', err);
    } finally {
      setIsRevoking(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col gap-10 opacity-20">
      <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
      <div className="h-[280px] w-full bg-gray-100 rounded-[2.5rem] animate-pulse" />
    </div>
  );

  const isGoogleConnected = !!profile?.google_refresh_token;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1.0] as const
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-10 pb-32"
    >

      {/* Header com Botão de Voltar */}
      <motion.div variants={itemVariants} className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center shrink-0 hover:bg-gray-50 transition-all active:scale-95"
          >
            <ArrowLeft size={20} className="text-gray-900" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-950 tracking-tight leading-none">Conexões</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
              EXPANDA O PODER DA SUA IA
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        <motion.div variants={itemVariants}>
          <WhatsAppConnectionCard />
        </motion.div>

        {/* GOOGLE CALENDAR CARD */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative w-full p-7"
        >
          <div className="flex justify-between items-start mb-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
              <Image
                src="/assets/google-calendar-logo.svg"
                alt="Google Calendar"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest leading-none shrink-0 ${isGoogleConnected ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
              {isGoogleConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {isGoogleConnected ? 'Sincronizado' : 'Não conectado'}
            </span>
          </div>

          <div className="flex flex-col gap-2 mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <CalendarIcon size={22} className="text-blue-500" />
              Conecte sua Agenda
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Sincronize sua agenda para que a IA verifique sua disponibilidade e crie agendamentos em tempo real.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {isGoogleConnected ? (
              <button
                onClick={handleRevokeGoogle}
                disabled={isRevoking}
                className="w-full h-12 border border-rose-100 text-rose-500 font-bold text-sm rounded-xl hover:bg-rose-50 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isRevoking ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                Desconectar Agenda
              </button>
            ) : (
              <button
                onClick={handleGoogleAuth}
                className="w-full h-14 bg-[#4285F4] hover:bg-[#357ae8] text-white font-black rounded-2xl shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="white" />
                  <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957273V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="white" fillOpacity="0.8" />
                  <path d="M5.03591 10.71C4.85591 10.17 4.75364 9.59318 4.75364 9C4.75364 8.40682 4.85591 7.83 5.03591 7.29V4.95818H1.02682C0.413182 6.17318 0.0545455 7.54773 0.0545455 9C0.0545455 10.4523 0.413182 11.8268 1.02682 13.0418L5.03591 10.71Z" fill="white" fillOpacity="0.8" />
                  <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957273 4.95818L5.03591 7.29C5.74364 5.16273 7.72773 3.57955 9 3.57955Z" fill="white" fillOpacity="0.8" />
                </svg>
                Conectar Agenda
              </button>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
