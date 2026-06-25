'use client';

import { useEffect, useState } from 'react';
import { Bot, ListOrdered, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

type ServiceMode = 'ai' | 'menu';

export function BrainSelector() {
  const [mode, setMode] = useState<ServiceMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchMode() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from('business_config')
          .select('context_json')
          .eq('owner_id', user.id)
          .single();

        const serviceMode = (data?.context_json as any)?.service_mode || 'ai';
        setMode(serviceMode);
      } catch (err) {
        console.error('[BRAIN_SELECTOR] Fetch error:', err);
        setMode('ai');
      } finally {
        setLoading(false);
      }
    }

    fetchMode();
  }, [supabase]);

  const switchMode = async (newMode: ServiceMode) => {
    if (switching || mode === newMode) return;
    setSwitching(true);

    const previousMode = mode;
    setMode(newMode);

    try {
      const res = await fetch('/api/dashboard/ai-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: newMode === 'ai',
          service_mode: newMode,
        }),
      });

      if (!res.ok) throw new Error('Failed to update');
    } catch (err) {
      console.error('[BRAIN_SELECTOR] Switch error:', err);
      setMode(previousMode);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-32 rounded-3xl bg-slate-50 border border-slate-100 animate-pulse flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-200" size={24} />
      </div>
    );
  }

  const options: { key: ServiceMode; label: string; description: string; icon: React.ReactNode }[] = [
    {
      key: 'ai',
      label: 'IA (Eliza)',
      description: 'Conversa natural e agendamento automático.',
      icon: <Bot size={22} />,
    },
    {
      key: 'menu',
      label: 'Menu fixo',
      description: 'Opções numeradas (1, 2, 3...).',
      icon: <ListOrdered size={22} />,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-full"
    >
      <div className="mb-3">
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
          Modo de atendimento
        </h3>
        <p className="text-sm font-medium text-slate-500 mt-0.5">
          Escolha como sua assistente deve responder.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = mode === opt.key;

          return (
            <button
              key={opt.key}
              onClick={() => switchMode(opt.key)}
              disabled={switching}
              className={`
                relative flex flex-col items-start gap-3 p-5 rounded-2xl border-2 transition-all duration-200 text-left
                ${isSelected
                  ? 'border-indigo-500 bg-indigo-50/70 shadow-sm'
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                }
                ${switching ? 'opacity-60 cursor-wait' : 'active:scale-[0.98] cursor-pointer'}
              `}
            >
              {/* Radio dot */}
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                ${isSelected ? 'border-indigo-500' : 'border-slate-300'}
              `}>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2.5 h-2.5 rounded-full bg-indigo-500"
                  />
                )}
              </div>

              {/* Icon */}
              <div className={`
                p-2 rounded-xl transition-colors
                ${isSelected ? 'text-indigo-600 bg-indigo-100' : 'text-slate-400 bg-slate-50'}
              `}>
                {opt.icon}
              </div>

              {/* Text */}
              <div>
                <span className={`
                  text-sm font-bold block tracking-tight
                  ${isSelected ? 'text-indigo-900' : 'text-slate-700'}
                `}>
                  {opt.label}
                </span>
                <span className="text-xs font-medium text-slate-500 leading-snug block mt-0.5">
                  {opt.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
