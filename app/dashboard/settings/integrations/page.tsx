'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Share2,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { hasAccess, PlanTier } from '@/lib/auth/access-control';

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
    window.location.href = `/api/auth/google?redirectTo=${encodeURIComponent(redirectTo)}`;
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
      <div className="h-64 w-full bg-gray-100 rounded-[2.5rem] animate-pulse" />
      <div className="h-64 w-full bg-gray-100 rounded-[2.5rem] animate-pulse" />
    </div>
  );

  const isGoogleConnected = !!profile?.google_refresh_token;
  const tier = (profile?.plan_tier as PlanTier) || 'STARTER';
  const hasSheetsAccess = hasAccess(tier, 'GOOGLE_SHEETS_SYNC');

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

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
            <Share2 size={20} />
          </div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">Integrações</h2>
        </div>
        <p className="text-base font-medium text-gray-500 max-w-lg">
          Conecte ferramentas externas para expandir o poder da sua IA. Eliza pode ler e escrever na sua agenda em tempo real.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6">
        {/* GOOGLE CALENDAR CARD */}
        <motion.div 
          variants={itemVariants}
          className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-8 md:p-10 flex flex-col gap-8 relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 z-10 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-32 h-32 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Image
                  src="/assets/google-calendar-logo.svg"
                  alt="Google Calendar"
                  width={128}
                  height={128}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-gray-950 tracking-tight">Google Calendar</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Gestão de agenda</p>
              </div>
            </div>

            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest z-10 transition-all ${isGoogleConnected ? 'bg-green-50 text-green-600 border-green-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
              <div className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              {isGoogleConnected ? 'Sincronizado' : 'Não conectado'}
            </div>
          </div>

          <div className="flex flex-col gap-6 z-10 text-center md:text-left">
            <p className="text-base font-medium text-gray-500 leading-relaxed max-w-lg mx-auto md:mx-0">
              Sincronize sua agenda do Google para que a Eliza possa verificar sua disponibilidade em tempo real e criar novos agendamentos sem conflitos.
            </p>

            {isGoogleConnected && (
              <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-bold text-gray-600 bg-gray-50 w-fit px-5 py-3 rounded-2xl mx-auto md:mx-0 border border-black/5">
                <ShieldCheck size={18} className="text-green-500" />
                Permissão vitalícia concedida
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row items-center gap-4 z-10">
            {isGoogleConnected ? (
              <button
                onClick={handleRevokeGoogle}
                disabled={isRevoking}
                className="w-full md:w-auto h-14 px-8 rounded-2xl bg-red-50 text-red-600 font-bold text-base flex items-center justify-center gap-3 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50 border border-red-100"
              >
                {isRevoking ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
                Revogar acesso
              </button>
            ) : (
              <button
                onClick={handleGoogleAuth}
                className="w-full md:w-auto group/btn relative h-14 px-8 rounded-2xl bg-white border border-black/10 text-gray-900 font-bold text-base flex items-center justify-center gap-4 overflow-hidden transition-all hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 active:scale-95 shadow-sm"
              >
                <div className="flex items-center justify-center transition-transform group-hover/btn:scale-110">
                  <svg width="24" height="24" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4" />
                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957273V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
                    <path d="M5.03591 10.71C4.85591 10.17 4.75364 9.59318 4.75364 9C4.75364 8.40682 4.85591 7.83 5.03591 7.29V4.95818H1.02682C0.413182 6.17318 0.0545455 7.54773 0.0545455 9C0.0545455 10.4523 0.413182 11.8268 1.02682 13.0418L5.03591 10.71Z" fill="#FBBC05" />
                    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957273 4.95818L5.03591 7.29C5.74364 5.16273 7.72773 3.57955 9 3.57955Z" fill="#EA4335" />
                  </svg>
                </div>
                Conectar agenda do Google
              </button>
            )}

            <button className="h-14 w-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-gray-600 transition-all border border-black/5 hover:border-black/10">
              <ExternalLink size={20} />
            </button>
          </div>

          {/* Decor */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/10 transition-colors duration-700" />
        </motion.div>

        {/* GOOGLE SHEETS CARD */}
        <motion.div 
          variants={itemVariants} 
          className={`
            rounded-[2.5rem] border p-8 md:p-10 flex flex-col gap-8 relative overflow-hidden transition-all
            ${hasSheetsAccess 
              ? 'bg-white border-black/5 shadow-sm group hover:shadow-xl hover:shadow-purple-500/5' 
              : 'bg-gray-50/50 border-gray-200 opacity-70 grayscale'}
          `}
        >
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 z-10 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-32 h-32 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                <Image
                  src="/assets/google-sheets-logo.svg"
                  alt="Google Sheets"
                  width={128}
                  height={128}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-black text-gray-950 tracking-tight">Google Sheets</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Exportação de dados</p>
              </div>
            </div>

            {!hasSheetsAccess && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-[10px] font-black uppercase tracking-widest z-10">
                <span className="w-2 h-2 bg-purple-500 rounded-full" />
                Plano PRO
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 z-10 text-center md:text-left">
            <p className="text-base font-medium text-gray-500 leading-relaxed max-w-lg mx-auto md:mx-0">
              Exporte seus leads e históricos de conversas automaticamente para planilhas do Google para análises avançadas e CRM.
            </p>
          </div>

          <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row items-center gap-4 z-10">
            {hasSheetsAccess ? (
              <button
                className="w-full md:w-auto group/btn relative h-14 px-8 rounded-2xl bg-white border border-black/10 text-gray-900 font-bold text-base flex items-center justify-center gap-4 overflow-hidden transition-all hover:border-green-500 hover:shadow-lg hover:shadow-green-500/10 active:scale-95 shadow-sm"
              >
                <div className="flex items-center justify-center transition-transform group-hover/btn:scale-110">
                  <svg width="24" height="24" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4" />
                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957273V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
                    <path d="M5.03591 10.71C4.85591 10.17 4.75364 9.59318 4.75364 9C4.75364 8.40682 4.85591 7.83 5.03591 7.29V4.95818H1.02682C0.413182 6.17318 0.0545455 7.54773 0.0545455 9C0.0545455 10.4523 0.413182 11.8268 1.02682 13.0418L5.03591 10.71Z" fill="#FBBC05" />
                    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957273 4.95818L5.03591 7.29C5.74364 5.16273 7.72773 3.57955 9 3.57955Z" fill="#EA4335" />
                  </svg>
                </div>
                Conectar planilhas do Google
              </button>
            ) : (
              <button
                onClick={() => {
                  console.log(`[UPSELL_TRACK] User on ${tier} clicked gated feature: GOOGLE_SHEETS_SYNC`);
                  router.push('/dashboard/settings/payments');
                }}
                className="w-full md:w-auto h-14 px-8 rounded-2xl bg-gray-100 text-gray-400 font-bold text-base flex items-center justify-center gap-3 hover:bg-gray-200 hover:text-gray-600 transition-all"
              >
                Indisponível no seu plano
              </button>
            )}
          </div>

          {/* Decor */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl -z-10 group-hover:bg-purple-500/10 transition-colors duration-700" />
        </motion.div>
      </div>
    </motion.div>
  );
}
