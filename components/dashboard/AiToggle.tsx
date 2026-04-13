'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function AiToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasServices, setHasServices] = useState<boolean | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchInitialStatus() {
      try {
        const res = await fetch('/api/dashboard/system-toggle');
        const data = await res.json();
        setEnabled(data.enabled ?? true);
      } catch (error) {
        console.error('[AI_TOGGLE] Fetch error:', error);
        setEnabled(true);
      }
    }

    async function fetchServicesCount() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasServices(false);
          return;
        }

        const { data, error } = await supabase
          .from('business_config')
          .select('context_json')
          .eq('owner_id', user.id)
          .single();

        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const servicesList = (data?.context_json as any)?.services || [];
        setHasServices(servicesList.length > 0);
      } catch (err) {
        console.error('[AI_TOGGLE] Services fetch error:', err);
        setHasServices(false);
      }
    }

    fetchInitialStatus();
    fetchServicesCount();
  }, [supabase]);

  const toggleAi = async () => {
    if (enabled === null || loading) return;

    // GUARDRAIL: Prevent turning ON if there are no configured services
    if (!enabled && hasServices === false) {
      setShowServiceModal(true);
      return;
    }

    const previousState = enabled;
    const newState = !previousState;

    setEnabled(newState);
    setLoading(true);

    try {
      const res = await fetch('/api/dashboard/system-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      });

      if (!res.ok) throw new Error('Failed to update');

      const data = await res.json();
      setEnabled(data.enabled);
    } catch (error) {
      console.error('[AI_TOGGLE] Toggle error:', error);
      setEnabled(previousState);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        {enabled === null ? (
          <div className="w-[52px] h-[30px] bg-slate-100 rounded-full animate-pulse" />
        ) : (
          <motion.button
            type="button"
            role="switch"
            aria-checked={enabled}
            initial={false}
            animate={{
              backgroundColor: enabled ? '#34C759' : '#FF3B30'
            }}
            onClick={toggleAi}
            className={`relative w-[52px] h-[30px] rounded-full shrink-0 shadow-inner ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`
                absolute top-[2px] left-[2px] w-[26px] h-[26px] rounded-full bg-white shadow-md flex items-center justify-center
                ${enabled ? 'translate-x-[22px]' : 'translate-x-0'}
              `}
            >
            </motion.span>
          </motion.button>
        )}
      </div>

      {/* GUARDRAIL MODAL */}
      <AnimatePresence>
        {showServiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowServiceModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mb-4 border border-amber-100">
                <AlertTriangle className="text-amber-500" size={28} />
              </div>

              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                Atenção
              </h3>

              <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                Usuário, você precisa cadastrar algum serviço antes de ligar a inteligência artificial.
              </p>

              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="flex-1 h-11 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-all text-sm hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowServiceModal(false);
                    router.push('/dashboard/services');
                  }}
                  className="flex-1 h-11 bg-slate-900 text-white font-bold rounded-xl active:scale-95 transition-all shadow-md text-sm hover:bg-slate-800"
                >
                  Cadastrar Serviço
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
