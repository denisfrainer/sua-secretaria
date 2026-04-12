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
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';

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
    connection_status: row.context_json?.connection_status || 'DISCONNECTED',
    context_json: row.context_json || {},
  };
}

export default function WhatsAppSettingsPage() {
  const [dbState, setDbState] = useState<DbState | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
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
  // SINGLE SOURCE OF TRUTH: Derived strictly from DB row
  // ────────────────────────────────────────────────────────
  const hasInstance = Boolean(dbState?.instance_name);
  const isConnected = hasInstance && dbState?.connection_status === 'CONNECTED';

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

  // ────────────────────────────────────────────────────────
  // ACTIONS: All onClick-only.
  // ────────────────────────────────────────────────────────
  const handleInitializeInstance = async () => {
    setInitializing(true);
    try {
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const businessName = user.user_metadata?.business_name || 'Minha Empresa';
      const slug = businessName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
      const name = `${slug || 'studio'}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const initRes = await fetch('/api/instance/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: name }),
      });

      if (initRes.status === 409) {
        const data = await initRes.json();
        alert(data.error || 'Você já possui uma instância. Exclua a atual antes de criar uma nova.');
      } else if (!initRes.ok) {
        throw new Error('Erro ao inicializar IA.');
      }

      // Force immediate DB re-read after mutation
      await fetchFromDb(false);
    } catch (err) {
      console.error('[WA_INIT] Error:', err);
    } finally {
      // Intentionally kept slightly active to allow QR polling to kick in
      setTimeout(() => setInitializing(false), 2000); 
    }
  };

  const handleDeleteInstance = async () => {
    if (!dbState?.instance_name) return;
    const confirmed = window.confirm(`Tem certeza que deseja desconectar o WhatsApp da IA? A automação será interrompida.`);
    if (!confirmed) return;
    
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/instance/delete?instance=${dbState.instance_name}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        console.error('[WA_DELETE] Failed:', data);
      }
      await fetchFromDb(false);
    } catch (err) {
      console.error('[WA_DELETE] Error:', err);
    } finally {
      setDisconnecting(false);
    }
  };

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
      
      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 1: THE HERO (AI BOT CONNECTION)                  */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden transition-all duration-300">
        
        {/* Card Header */}
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex gap-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
              <Bot size={28} className="text-[#533CFA]" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <Image src="/assets/whatsapp.svg" alt="WhatsApp" width={24} height={24} />
                Conexão da IA Atendente
                
                {/* Dynamic Status Indicator */}
                {!hasInstance ? (
                   <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">
                     <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                     Inativo
                   </span>
                ) : !isConnected ? (
                   <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-black uppercase tracking-widest leading-none">
                     <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                     Aguardando Leitura
                   </span>
                ) : (
                   <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-black uppercase tracking-widest leading-none">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                     Conectado
                   </span>
                )}
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-1 max-w-md leading-relaxed">
                Automatize o atendimento. Conecte o número de WhatsApp do seu negócio para que a IA agende clientes e tire dúvidas 24/7.
              </p>
            </div>
          </div>
          
          {/* Action Area for Top Header (Only if completely inactive) */}
          {!hasInstance && (
            <button
              onClick={handleInitializeInstance}
              disabled={initializing}
              className="h-12 px-6 bg-[#533CFA] hover:bg-[#432EEA] text-white font-bold rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all outline-none disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {initializing ? <Loader2 className="animate-spin" size={18} /> : <QrCode size={18} />}
              {initializing ? 'Iniciando...' : 'Gerar QR Code'}
            </button>
          )}
          
          {/* Action Area for Active (Disconnect) */}
          {isConnected && (
            <button
              onClick={handleDeleteInstance}
              disabled={disconnecting}
              className="h-10 px-4 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {disconnecting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Desconectar
            </button>
          )}
        </div>

        {/* Inline Body (State Driven) */}
        <div className="bg-slate-50/50">
          <AnimatePresence mode="wait">
            {/* STATE: Initialize loading (UX feedback right after click) */}
            {initializing && !hasInstance && (
              <motion.div 
                key="init_loading"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-8 flex flex-col items-center justify-center text-center gap-4"
              >
                <div className="w-16 h-16 bg-white border border-slate-100 shadow-sm rounded-2xl flex items-center justify-center mb-2">
                  <Loader2 className="animate-spin text-[#533CFA]" size={28} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Preparando servidor dedicado...</h3>
                  <p className="text-xs text-slate-500 mt-1">Sua instância está sendo criada de forma segura.</p>
                </div>
              </motion.div>
            )}

            {/* STATE: QR Code Ready for Scanning */}
            {hasInstance && !isConnected && !initializing && (
              <motion.div
                key="qr_code"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 flex flex-col items-center border-t border-slate-100"
              >
                <div className="bg-white p-3 rounded-3xl shadow-sm border border-slate-200 mb-6">
                  <QRCodeDisplay
                    instanceName={dbState!.instance_name!}
                    onConnected={() => fetchFromDb(false)}
                  />
                </div>
                
                <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-2xl gap-4 bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <div className="flex flex-col text-left">
                      <h4 className="text-sm font-bold text-blue-900 tracking-tight">Problemas para ler o código?</h4>
                      <p className="text-xs font-medium text-blue-700/80 leading-relaxed max-w-sm mt-0.5">
                        Aguarde o carregamento do código se a tela estiver cinza. Caso demore muito tempo, recrie a instância.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleDeleteInstance}
                    disabled={disconnecting}
                    className="h-10 px-5 bg-white border border-rose-200 text-rose-500 font-bold text-xs rounded-xl flex items-center gap-2 hover:bg-rose-50 transition-all shadow-sm shrink-0 whitespace-nowrap disabled:opacity-50"
                  >
                    {disconnecting ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                    Reiniciar
                  </button>
                </div>
              </motion.div>
            )}

            {/* STATE: Active / Working */}
            {isConnected && (
              <motion.div
                key="active"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 flex flex-col sm:flex-row items-center gap-6"
              >
                {/* Visual Data / Pulse Graphic */}
                <div className="relative flex shrink-0">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center z-10 border-4 border-white shadow-sm">
                    <CheckCircle2 size={28} className="text-emerald-500" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 rounded-full bg-emerald-400 animate-ping opacity-20" />
                </div>
                
                <div className="flex flex-col text-left">
                  <h3 className="text-base font-bold text-slate-900">Operação Automática</h3>
                  <p className="text-sm text-slate-500 mt-1 max-w-md">
                    Seu assistente de inteligência artificial já está recebendo e analisando mensagens no WhatsApp.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* SECTION 2: THE SECONDARY CARD (MENU & HANDOFF)           */}
      {/* ──────────────────────────────────────────────────────── */}
      <div className="bg-transparent border border-slate-200 rounded-[2rem] p-6 lg:p-8 flex flex-col relative overflow-hidden group hover:border-slate-300 transition-colors">
        
        {/* Toggle Header Area */}
        <div 
          className="flex flex-col md:flex-row justify-between cursor-pointer w-full transition-opacity hover:opacity-80 gap-4"
          onClick={() => setIsMenuExpanded(!isMenuExpanded)}
        >
           <div className="flex gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <Settings2 size={22} className="text-slate-600" />
            </div>
            <div className="flex flex-col pt-1">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Menu de Transbordo</h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Configure números de escape e redirecionamentos manuais.
              </p>
            </div>
          </div>
          <button className="h-10 px-5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm whitespace-nowrap self-start md:self-center">
            {isMenuExpanded ? (
              <>Esconder <ChevronUp size={16} /></>
            ) : (
              <>Configurar <ChevronDown size={16} /></>
            )}
          </button>
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
                  placeholder="ex: meatende.ai/estudio"
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
