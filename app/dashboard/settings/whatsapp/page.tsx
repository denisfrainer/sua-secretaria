'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Smartphone,
  List,
  ChevronRight,
  ArrowLeft,
  Link2,
  PhoneForwarded,
  Save,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';

type ViewState = null | 'infra' | 'menu';

export default function WhatsAppSettingsPage() {
  const [activeView, setActiveView] = useState<ViewState>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingBehavior, setSavingBehavior] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [handoffNumber, setHandoffNumber] = useState('');
  const [schedulingLink, setSchedulingLink] = useState('');
  
  const supabase = createClient();

  // ────────────────────────────────────────────────────────
  // SINGLE SOURCE OF TRUTH: Derive state strictly from DB
  // ────────────────────────────────────────────────────────
  const instanceName: string | null = config?.instance_name?.trim() || null;
  const connectionStatus: string = config?.context_json?.connection_status || 'DISCONNECTED';
  const hasInstance = Boolean(instanceName);
  const isConnected = hasInstance && connectionStatus === 'CONNECTED';

  const fetchStatus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('business_config')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (data) {
        setConfig(data);
        const info = data.context_json?.business_info;
        setHandoffNumber(info?.handoff_phone || '');
        setSchedulingLink(info?.scheduling_link || '');
      }
    }
    setLoading(false);
  }, [supabase]);

  // Initial load — fetch DB state ONCE on mount. No auto-init.
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleViewChange = (view: ViewState) => {
    setActiveView(view);
  };

  // ────────────────────────────────────────────────────────
  // INITIALIZE: Strictly onClick only. Never auto-triggered.
  // ────────────────────────────────────────────────────────
  const handleInitializeInstance = async () => {
    setInitializing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const businessName = user.user_metadata?.business_name || 'Minha Empresa';
      const slug = businessName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
      const name = `${slug || 'studio'}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const initRes = await fetch('/api/instance/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceName: name })
      });

      if (initRes.status === 409) {
        const data = await initRes.json();
        alert(data.error || 'Você já possui uma instância. Exclua a atual antes de criar uma nova.');
        await fetchStatus();
        return;
      }

      if (!initRes.ok) throw new Error("Erro ao inicializar IA.");
      
      // Refresh DB state — will now have instance_name set + DISCONNECTED → shows QR
      await fetchStatus();
    } catch (err) { console.error(err); } 
    finally { setInitializing(false); }
  };

  const handleSaveBehavior = async () => {
    if (!config) return;
    setSavingBehavior(true);
    setSaveSuccess(false);
    try {
      const newContext = {
        ...config.context_json,
        business_info: {
          ...(config.context_json?.business_info || {}),
          handoff_phone: handoffNumber,
          scheduling_link: schedulingLink
        }
      };
      const { error } = await supabase.from('business_config').update({ context_json: newContext }).eq('id', config.id);
      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) { console.error(err); } 
    finally { setSavingBehavior(false); }
  };

  const handleDeleteInstance = async () => {
    if (!instanceName) return;
    const confirmed = window.confirm(`Tem certeza que deseja excluir a instância "${instanceName}"? Esta ação é irreversível.`);
    if (!confirmed) return;
    
    setDisconnecting(true);
    try {
      const res = await fetch(`/api/instance/delete?instance=${instanceName}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        console.error('Delete failed:', data);
      }
      await fetchStatus();
    } catch (err) { console.error(err); } 
    finally { setDisconnecting(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600 opacity-20" size={32} /></div>;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      
      {/* HEADER */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          {activeView && (
            <button 
              onClick={() => handleViewChange(null)}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {activeView === 'infra' ? 'Conectar Celular' : activeView === 'menu' ? 'Menu do Robô' : 'WhatsApp'}
          </h2>
        </div>
        <p className="text-sm font-medium text-slate-500">
          {activeView === 'infra' ? 'Ligue seu WhatsApp ao sistema para começar.' : activeView === 'menu' ? 'Personalize o que o robô responde aos seus clientes.' : 'Gerencie a conexão e comportamento do seu robô.'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ══════════════════════════════════════════════ */}
        {/* HUB VIEW: Two navigation cards                */}
        {/* ══════════════════════════════════════════════ */}
        {!activeView ? (
          <motion.div 
            key="hub"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-4"
          >
            <button 
              onClick={() => handleViewChange('infra')}
              className="group flex items-center gap-4 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-slate-200 transition-all text-left w-full"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-[#533CFA]">
                <Smartphone size={24} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-lg font-bold text-slate-900">Conectar Celular</h3>
                <p className="text-sm font-medium text-slate-400">Status da conexão e QR Code.</p>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                {isConnected && (
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Ativo
                  </div>
                )}
                <ChevronRight size={20} />
              </div>
            </button>

            <button 
              onClick={() => handleViewChange('menu')}
              className="group flex items-center gap-4 p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:border-slate-200 transition-all text-left w-full"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                <List size={24} />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-lg font-bold text-slate-900">Menu do Robô</h3>
                <p className="text-sm font-medium text-slate-400">Defina links e números de transbordo.</p>
              </div>
              <ChevronRight size={20} className="text-slate-300" />
            </button>
          </motion.div>

        /* ══════════════════════════════════════════════ */
        /* INFRA VIEW: Strict 3-state machine            */
        /* ══════════════════════════════════════════════ */
        ) : activeView === 'infra' ? (
          <motion.div 
            key="infra"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6"
          >
            {/* ─── STATE A: No instance → Create button ─── */}
            {!hasInstance ? (
              <div className="bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-10 flex flex-col items-center text-center gap-6">
                <RefreshCw size={40} className="text-slate-200" />
                <h3 className="text-lg font-bold text-slate-900">Infraestrutura pendente</h3>
                <p className="text-sm text-slate-400 max-w-xs">Clique abaixo para gerar um QR Code e conectar seu WhatsApp.</p>
                <button 
                  onClick={handleInitializeInstance}
                  disabled={initializing}
                  className="w-full h-14 bg-[#533CFA] text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all outline-none disabled:opacity-50"
                >
                  {initializing ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Gerar QR Code'}
                </button>
              </div>

            /* ─── STATE B: Instance exists + DISCONNECTED → QR Code ─── */
            ) : !isConnected ? (
              <>
                <QRCodeDisplay 
                  instanceName={instanceName!} 
                  onConnected={fetchStatus}
                />

                <button
                  onClick={handleDeleteInstance}
                  disabled={disconnecting}
                  className="w-full h-14 rounded-2xl bg-red-50 text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={18} />}
                  Excluir Instância
                </button>

                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 flex items-start gap-4">
                  <AlertCircle className="text-slate-400 shrink-0" size={20} />
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold text-slate-900 tracking-tight">Problemas com o QR Code?</h4>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                      Se o código demorar, aguarde alguns segundos. Se travar, clique em &quot;Excluir Instância&quot; e tente novamente.
                    </p>
                  </div>
                </div>
              </>

            /* ─── STATE C: Instance exists + CONNECTED → Active ─── */
            ) : (
              <>
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center gap-6 relative overflow-hidden">
                  <div className="w-20 h-20 rounded-[2rem] bg-green-50 flex items-center justify-center shadow-lg shadow-green-500/10 mb-2">
                    <CheckCircle2 size={40} className="text-green-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">WhatsApp Ativo</h3>
                    <p className="text-sm font-medium text-slate-400">Instância operando normalmente.</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Online
                  </div>
                </div>

                <button
                  onClick={handleDeleteInstance}
                  disabled={disconnecting}
                  className="w-full h-14 rounded-2xl bg-red-50 text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {disconnecting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={18} />}
                  Excluir Instância
                </button>
              </>
            )}
          </motion.div>

        /* ══════════════════════════════════════════════ */
        /* MENU VIEW: Behavior settings                  */
        /* ══════════════════════════════════════════════ */
        ) : (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col gap-8">
              <div className="grid grid-cols-1 gap-6">
                <StudioInput 
                  label="Link da Agenda" 
                  placeholder="ex: meatende.ai/s/seustudio"
                  icon={<Link2 size={18} />}
                  value={schedulingLink}
                  onChange={setSchedulingLink}
                />
                <StudioInput 
                  label="WhatsApp da Recepção (Transbordo)" 
                  placeholder="ex: 5511999999999"
                  icon={<PhoneForwarded size={18} />}
                  value={handoffNumber}
                  onChange={setHandoffNumber}
                />
              </div>

              <button
                onClick={handleSaveBehavior}
                disabled={savingBehavior || !config}
                className={`
                  h-14 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98]
                  ${saveSuccess 
                    ? 'bg-green-500 text-white' 
                    : 'bg-[#533CFA] text-white hover:brightness-110 shadow-lg shadow-indigo-500/10 disabled:opacity-50'}
                `}
              >
                {savingBehavior ? <Loader2 className="animate-spin" size={18} /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {saveSuccess ? 'Configurações Salvas!' : 'Salvar Alterações'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
