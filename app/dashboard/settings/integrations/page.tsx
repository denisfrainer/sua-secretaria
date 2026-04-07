'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Share2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Calendar,
  LogOut,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function IntegrationsSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
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

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600 opacity-20" size={32} /></div>;

  const isGoogleConnected = !!profile?.google_refresh_token;

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 border border-indigo-500/10">
            <Share2 size={20} />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Ecosistema de Integrações</h2>
        </div>
        <p className="text-sm font-medium text-gray-400 max-w-lg">
          Conecte ferramentas externas para expandir o poder da sua IA. Eliza pode ler e escrever na sua agenda em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* GOOGLE CALENDAR CARD */}
        <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-8 flex flex-col gap-8 relative overflow-hidden group hover:shadow-xl hover:shadow-blue-500/5 transition-all">
          <div className="flex items-start justify-between z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center border border-black/5 p-3 group-hover:scale-105 transition-transform duration-500">
                <img 
                  src="/assets/agenda-logo.svg" 
                  alt="Google Calendar" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Google Calendar</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Gestão de Agenda</p>
              </div>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest z-10 transition-all ${isGoogleConnected ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
              <div className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              {isGoogleConnected ? 'Sincronizado' : 'Não Conectado'}
            </div>
          </div>

          <div className="flex flex-col gap-4 z-10">
            <p className="text-sm font-medium text-gray-500 leading-relaxed max-w-sm">
              Sincronize sua agenda do Google para que a Eliza possa verificar sua disponibilidade em tempo real e criar novos agendamentos sem conflitos.
            </p>
            
            {isGoogleConnected && (
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50/50 w-fit px-4 py-2 rounded-xl">
                <ShieldCheck size={14} className="text-green-500" />
                Permissão Vitalícia (Offline Access)
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-black/5 flex items-center gap-3 z-10">
            {isGoogleConnected ? (
              <button
                onClick={handleRevokeGoogle}
                disabled={isRevoking}
                className="h-12 px-6 rounded-2xl bg-red-50 text-red-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {isRevoking ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                Revogar Acesso
              </button>
            ) : (
              <button
                onClick={handleGoogleAuth}
                className="group/btn relative h-12 px-8 rounded-2xl bg-white border border-black/10 text-gray-700 font-black text-xs uppercase tracking-widest flex items-center gap-3 overflow-hidden transition-all hover:border-gray-900 active:scale-95"
              >
                <div className="flex items-center justify-center p-0.5">
                  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957273V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                    <path d="M5.03591 10.71C4.85591 10.17 4.75364 9.59318 4.75364 9C4.75364 8.40682 4.85591 7.83 5.03591 7.29V4.95818H1.02682C0.413182 6.17318 0.0545455 7.54773 0.0545455 9C0.0545455 10.4523 0.413182 11.8268 1.02682 13.0418L5.03591 10.71Z" fill="#FBBC05"/>
                    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957273 4.95818L5.03591 7.29C5.74364 5.16273 7.72773 3.57955 9 3.57955Z" fill="#EA4335"/>
                  </svg>
                </div>
                Conectar Agenda do Google
              </button>
            )}

            <button className="h-12 w-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-gray-600 transition-all">
              <ExternalLink size={18} />
            </button>
          </div>

          {/* Decor */}
          <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/10 transition-colors duration-700" />
        </div>
      </div>
    </div>
  );
}
