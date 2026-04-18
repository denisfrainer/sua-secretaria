'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Wifi, WifiOff, Pause, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WhatsAppConnectionCard } from './WhatsAppConnectionCard';
import { TrialStatusBox } from './TrialStatusBox';

interface StatusState {
  isConnected: boolean;
  isAiEnabled: boolean;
  planTier: string;
  trialEndsAt: string | null;
}

export function StatusHeader() {
  const [status, setStatus] = useState<StatusState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [toggling, setToggling] = useState(false);

  const supabaseRef = useRef(createClient());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async (isInitial = false) => {
    try {
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStatus(null);
        if (isInitial) setLoading(false);
        return;
      }

      const [configRes, profileRes] = await Promise.all([
        supabase
          .from('business_config')
          .select('instance_name, context_json, status')
          .eq('owner_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('plan_tier, trial_ends_at')
          .eq('id', user.id)
          .single()
      ]);

      const config = configRes.data;
      const profile = profileRes.data;

      const hasInstance = Boolean(config?.instance_name?.trim());
      const connStatus = config?.status || config?.context_json?.connection_status || 'DISCONNECTED';
      const isConnected = hasInstance && connStatus === 'CONNECTED';
      const isAiEnabled = config?.context_json?.is_ai_enabled ?? true;

      setStatus({
        isConnected,
        isAiEnabled,
        planTier: profile?.plan_tier || 'FREE',
        trialEndsAt: profile?.trial_ends_at || null,
      });
    } catch (err) {
      console.error('[STATUS_HEADER] Fetch error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus(true);
    pollingRef.current = setInterval(() => fetchStatus(false), 5000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchStatus]);

  const handlePauseAll = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch('/api/dashboard/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });
      if (res.ok) {
        setStatus(prev => prev ? { ...prev, isAiEnabled: false } : prev);
      }
    } catch (err) {
      console.error('[STATUS_HEADER] Pause error:', err);
    } finally {
      setToggling(false);
    }
  };

  const handleResumeAll = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch('/api/dashboard/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      });
      if (res.ok) {
        setStatus(prev => prev ? { ...prev, isAiEnabled: true } : prev);
      }
    } catch (err) {
      console.error('[STATUS_HEADER] Resume error:', err);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-28 rounded-3xl bg-slate-100 animate-pulse flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-300" size={24} />
      </div>
    );
  }

  if (!status) return null;

  const isActive = status.isConnected && status.isAiEnabled;
  const isConnectedButPaused = status.isConnected && !status.isAiEnabled;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className={`
          w-full rounded-3xl p-6 relative overflow-hidden transition-colors duration-500
          ${isActive
            ? 'bg-emerald-500 text-white'
            : isConnectedButPaused
              ? 'bg-amber-500 text-white'
              : 'bg-slate-800 text-white'
          }
        `}
      >
        {/* Subtle animated glow for active state */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent pointer-events-none" />
        )}

        <div className="relative z-10 flex flex-col gap-4">
          {/* Top row: status pill + trial badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isActive ? (
                <Wifi size={18} className="text-emerald-100" />
              ) : status.isConnected ? (
                <Pause size={18} className="text-amber-100" />
              ) : (
                <WifiOff size={18} className="text-slate-400" />
              )}
              <span className="text-xs font-black uppercase tracking-widest opacity-80">
                {isActive ? 'Online' : isConnectedButPaused ? 'Pausado' : 'Offline'}
              </span>
            </div>

            {status.isConnected && (
              <TrialStatusBox
                planTier={status.planTier}
                trialEndsAt={status.trialEndsAt}
              />
            )}
          </div>

          {/* Main text */}
          <div>
            <h2 className="text-xl font-extrabold tracking-tight leading-tight">
              {isActive
                ? 'Seu robô está atendendo agora ✨'
                : isConnectedButPaused
                  ? 'Atendimento pausado'
                  : 'Seu robô está parado'
              }
            </h2>
            <p className="text-sm font-medium opacity-75 mt-1">
              {isActive
                ? 'Clientes estão sendo atendidos automaticamente.'
                : isConnectedButPaused
                  ? 'Clique abaixo para retomar o atendimento.'
                  : 'Conecte seu WhatsApp para começar.'
              }
            </p>
          </div>

          {/* Action button */}
          {isActive ? (
            <button
              onClick={handlePauseAll}
              disabled={toggling}
              className="w-full h-14 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-extrabold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              {toggling ? <Loader2 className="animate-spin" size={18} /> : <Pause size={18} />}
              Pausar tudo
            </button>
          ) : isConnectedButPaused ? (
            <button
              onClick={handleResumeAll}
              disabled={toggling}
              className="w-full h-14 bg-white text-amber-600 font-extrabold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              {toggling ? <Loader2 className="animate-spin" size={18} /> : <Power size={18} />}
              Retomar atendimento
            </button>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="w-full h-14 bg-white text-slate-900 font-extrabold rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Power size={18} />
              Conectar WhatsApp
            </button>
          )}
        </div>
      </motion.div>

      {/* Connection Modal */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConnectModal(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md z-10"
            >
              <WhatsAppConnectionCard />
              <button
                onClick={() => setShowConnectModal(false)}
                className="mt-4 w-full h-12 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-2xl hover:bg-slate-50 transition-all"
              >
                Fechar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
