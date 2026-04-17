'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Bot,
  Link2,
  PhoneForwarded,
  Save,
  QrCode,
  Settings2,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';
import { WhatsAppConnectionCard } from '@/components/dashboard/WhatsAppConnectionCard';

// ────────────────────────────────────────────────────────
// DB STATE INTERFACE
// ────────────────────────────────────────────────────────
interface DbState {
  id: string;
  instance_name: string | null;
  connection_status: string;  // 'CONNECTED' | 'DISCONNECTED'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context_json: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDbState(row: any): DbState | null {
  if (!row) return null;
  return {
    id: row.id,
    instance_name: row.instance_name?.trim() || null,
    connection_status: row.status || row.context_json?.connection_status || 'DISCONNECTED',
    context_json: row.context_json || {},
  };
}

export default function WhatsAppSettingsPage() {
  const [dbState, setDbState] = useState<DbState | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBehavior, setSavingBehavior] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // UI States
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  const [handoffNumber, setHandoffNumber] = useState('');
  const [schedulingLink, setSchedulingLink] = useState('');

  // Stable ref to Supabase client — never changes across renders
  const supabaseRef = useRef(createClient());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ────────────────────────────────────────────────────────
  // FETCH: Always hits Supabase directly, no cache
  // ────────────────────────────────────────────────────────
  const fetchFromDb = useCallback(async (isInitialLoad = false) => {
    try {
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDbState(null);
        if (isInitialLoad) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('business_config')
        .select('id, instance_name, context_json')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[WA_FETCH] DB error:', error.message);
        if (isInitialLoad) setLoading(false);
        return;
      }

      // CRITICAL: Always overwrite state, even with null.
      const extracted = extractDbState(data);
      setDbState(extracted);

      if (extracted) {
        const info = extracted.context_json?.business_info;
        setHandoffNumber(info?.handoff_phone || '');
        setSchedulingLink(info?.scheduling_link || '');
      }

    } catch (err) {
      console.error('[WA_FETCH] Exception:', err);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, []);

  // ────────────────────────────────────────────────────────
  // MOUNT: Fetch once + start polling every 4s
  // ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFromDb(true);

    pollingRef.current = setInterval(() => {
      fetchFromDb(false);
    }, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchFromDb]);
  const handleSaveBehavior = async () => {
    if (!dbState) return;
    setSavingBehavior(true);
    setSaveSuccess(false);
    try {
      const supabase = supabaseRef.current;
      const newContext = {
        ...dbState.context_json,
        business_info: {
          ...(dbState.context_json?.business_info || {}),
          handoff_phone: handoffNumber,
          scheduling_link: schedulingLink,
        },
      };
      const { error } = await supabase
        .from('business_config')
        .update({ context_json: newContext })
        .eq('id', dbState.id);
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await fetchFromDb(false);
      setIsMenuExpanded(false); // Collapse on save
    } catch (err) {
      console.error('[WA_SAVE] Error:', err);
    } finally {
      setSavingBehavior(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-blue-600 opacity-20" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 font-sans bg-slate-50 min-h-screen -mx-6 px-6 -mt-8 pt-8">

      {/* SECTION 1: THE SHARED CONNECTION CARD */}
      <WhatsAppConnectionCard />


      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 2: THE SECONDARY CARD (MENU & HANDOFF)           */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="bg-transparent border border-slate-200 rounded-[2rem] p-6 lg:p-8 flex flex-col relative overflow-hidden group hover:border-slate-300 transition-colors">

        {/* Toggle Header Area */}
        <div
          className="flex flex-col gap-4 cursor-pointer w-full transition-opacity hover:opacity-80"
          onClick={() => setIsMenuExpanded(!isMenuExpanded)}
        >
          {/* Row 1: Icon & Action */}
          <div className="flex justify-between items-start w-full">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <Settings2 size={22} className="text-slate-600" />
            </div>
            <button className="h-10 px-5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm whitespace-nowrap mt-1">
              {isMenuExpanded ? (
                <>Esconder <ChevronUp size={16} /></>
              ) : (
                <>Configurar <ChevronDown size={16} /></>
              )}
            </button>
          </div>

          {/* Row 2: Title & Desc */}
          <div className="flex flex-col w-full">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight text-left">Menu de Transbordo</h2>
            <p className="text-sm font-medium text-slate-500 mt-1 text-left leading-relaxed">
              Configure números de escape e redirecionamentos manuais.
            </p>
          </div>
        </div>

        {/* Collapsible Form */}
        <AnimatePresence>
          {isMenuExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden"
            >
              <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <StudioInput
                  label="Link da Agenda Online"
                  placeholder="ex: suasecretaria.com/estudio"
                  icon={<Link2 size={18} />}
                  value={schedulingLink}
                  onChange={setSchedulingLink}
                />
                <StudioInput
                  label="WhatsApp da Recepção (Humano)"
                  placeholder="ex: 5511999999999"
                  icon={<PhoneForwarded size={18} />}
                  value={handoffNumber}
                  onChange={setHandoffNumber}
                />
              </div>

              <div className="pt-6 flex justify-end border-t border-slate-200/60 mt-6">
                <button
                  onClick={handleSaveBehavior}
                  disabled={savingBehavior || !dbState}
                  className={`
                    h-12 px-8 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm shadow-sm
                    ${saveSuccess
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50'}
                  `}
                >
                  {savingBehavior ? <Loader2 className="animate-spin" size={16} /> : saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                  {saveSuccess ? 'Salvo com sucesso' : 'Salvar Alterações'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
