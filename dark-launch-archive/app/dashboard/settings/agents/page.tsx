'use client';

import { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Sparkles, 
  Smile, 
  ListChecks, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Zap,
  Target,
  ArrowLeft,
  Bot
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MinimalistHeader } from '@/components/dashboard/MinimalistHeader';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';
import { AutoResizeTextarea } from '@/components/dashboard/settings/AutoResizeTextarea';
import { OutreachManager } from '@/components/dashboard/OutreachManager';

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

function AgentsSettingsContent() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'personality';

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { data } = await supabase
        .from('business_config')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (data) setConfig(data);
      setLoading(false);
    }
    fetchData();
  }, [supabase, router]);

  const updateToneOfVoice = (field: string, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      context_json: {
        ...(config.context_json || {}),
        tone_of_voice: { ...(config.context_json?.tone_of_voice || {}), [field]: value }
      }
    });
  };

  const updateRules = (value: string) => {
    if (!config) return;
    const lines = value.split('\n');
    setConfig({
      ...config,
      context_json: { ...(config.context_json || {}), scheduling_rules: lines }
    });
  };
  
  const toggleAi = (enabled: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      context_json: { ...(config.context_json || {}), is_ai_enabled: enabled }
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;

    setSaving(true);
    const { error: updateError } = await supabase
      .from('business_config')
      .update({
        context_json: config.context_json,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id);

    if (updateError) {
      setError(`Erro ao salvar: ${updateError.message}`);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600 opacity-20" size={32} /></div>;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-10 pb-32"
    >
      
      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button 
          onClick={() => router.push('/dashboard/settings/agents?tab=personality')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'personality' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Personalidade
        </button>
        <button 
          onClick={() => router.push('/dashboard/settings/agents?tab=outbound')}
          className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'outbound' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Wolf Agent
        </button>
      </div>

      {activeTab === 'outbound' ? (
        <OutreachManager />
      ) : (
        <>
          {/* Custom Header with Back Button */}
          <motion.div variants={itemVariants} className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard"
                className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center shrink-0 hover:bg-gray-50 transition-all active:scale-95"
              >
                <ArrowLeft size={20} className="text-gray-900" />
              </Link>
              <div className="flex flex-col">
                <h1 className="text-3xl font-black text-gray-950 tracking-tight leading-none">Agente IA</h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
                  PERSONALIDADE & COMPORTAMENTO
                </p>
              </div>
            </div>
          </motion.div>

          {/* iOS STYLE TOGGLE CARD */}
          <motion.div 
            variants={itemVariants}
            onClick={() => toggleAi(!config?.context_json?.is_ai_enabled)}
            className={`group flex items-center justify-between p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer ${
              config?.context_json?.is_ai_enabled 
              ? 'bg-fuchsia-50/50 border-fuchsia-600/20 shadow-xl shadow-fuchsia-500/5' 
              : 'bg-white border-gray-100 hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${config?.context_json?.is_ai_enabled ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-slate-50 text-slate-400'}`}>
                <Bot size={28} />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-black text-gray-950 flex items-center gap-2">
                  Status do Agente
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-black ${
                    config?.context_json?.is_ai_enabled ? 'bg-fuchsia-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {config?.context_json?.is_ai_enabled ? 'Ativo' : 'Pausado'}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  {config?.context_json?.is_ai_enabled 
                    ? 'A Eliza está respondendo suas clientes automaticamente.' 
                    : 'A Eliza está pausada e não responderá nenhuma mensagem.'}
                </p>
              </div>
            </div>
            {/* iOS Toggle Switch */}
            <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${config?.context_json?.is_ai_enabled ? 'bg-fuchsia-600' : 'bg-gray-200'}`}>
               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${config?.context_json?.is_ai_enabled ? 'left-7' : 'left-1'}`} />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-10">
            {/* TONE OF VOICE */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                <Smile size={18} className="text-purple-600" />
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Identidade Visual & Tom</h3>
              </div>
              
              <div className="space-y-6">
                <StudioInput 
                  label="Estilo Base de Atendimento" 
                  value={config?.context_json?.tone_of_voice?.base_style || ''} 
                  onChange={(val) => updateToneOfVoice('base_style', val)}
                  placeholder="Ex: Profissional e amigável, Luxo e formal, etc."
                />

                <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                  <AutoResizeTextarea 
                    label="Instruções Dinâmicas"
                    value={config?.context_json?.tone_of_voice?.custom_instructions || ''} 
                    onChange={(val) => updateToneOfVoice('custom_instructions', val)}
                    placeholder="Ex: Use emojis de brilho ✨. Chame de 'flor'. Evite usar gírias muito pesadas."
                    className="w-full bg-transparent border-none p-0 text-base font-bold text-gray-700 focus:ring-0 placeholder:text-gray-300 leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* SCHEDULING RULES */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                <ListChecks size={18} className="text-purple-600" />
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Regras de Negócio</h3>
              </div>
              
              <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                <AutoResizeTextarea 
                  label="Regras de Agendamento"
                  value={config?.context_json?.scheduling_rules?.join('\n') || ''} 
                  onChange={updateRules}
                  placeholder="Ex: Cancelamento com 1h de antecedência. Não aceitamos menores sem autorização."
                  className="w-full bg-transparent border-none p-0 text-base font-bold text-gray-700 focus:ring-0 placeholder:text-gray-300 leading-relaxed"
                  rows={4}
                />
              </div>
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5 ml-2">
                <Zap size={12} />
                Eliza utiliza estas regras para filtrar das disponíveis.
              </p>
            </div>
          </div>

          {/* FLOAT SAVE BUTTON */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
            <button
              onClick={() => handleSubmit()}
              disabled={saving}
              className={`w-full h-16 rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl transition-all ${success ? 'bg-green-500' : 'bg-fuchsia-600 shadow-fuchsia-500/20'} text-white active:scale-95 disabled:opacity-50`}
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : success ? <CheckCircle2 size={20} /> : <Save size={20} />}
              {saving ? 'Guardando...' : success ? 'Configurações Salvas!' : 'Salvar Alterações'}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function AgentsSettingsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600 opacity-20" size={32} /></div>}>
      <AgentsSettingsContent />
    </Suspense>
  );
}
