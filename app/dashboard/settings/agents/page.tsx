'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  Smile, 
  ListChecks, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Zap 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';
import { AutoResizeTextarea } from '@/components/dashboard/settings/AutoResizeTextarea';

export default function AgentsSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
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
        ...config.context_json,
        tone_of_voice: { ...config.context_json.tone_of_voice, [field]: value }
      }
    });
  };

  const updateRules = (value: string) => {
    if (!config) return;
    const lines = value.split('\n');
    setConfig({
      ...config,
      context_json: { ...config.context_json, scheduling_rules: lines }
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
    <div className="flex flex-col gap-10 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 border border-purple-500/10">
            <Sparkles size={20} />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Personalidade da Eliza</h2>
        </div>
        <p className="text-sm font-medium text-gray-400 max-w-lg">
          Personalize a forma como a Eliza conversa com seus clientes. Defina o tom de voz, gírias preferidas e as regras de agendamento que ela deve seguir.
        </p>
      </div>

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
              value={config?.context_json.tone_of_voice?.base_style || ''} 
              onChange={(val) => updateToneOfVoice('base_style', val)}
              placeholder="Ex: Profissional e amigável, Luxo e formal, etc."
            />

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Instruções Dinâmicas</label>
              <div className="bg-white rounded-3xl p-6 border border-black/5 shadow-sm">
                <AutoResizeTextarea 
                  value={config?.context_json.tone_of_voice?.custom_instructions || ''} 
                  onChange={(val) => updateToneOfVoice('custom_instructions', val)}
                  placeholder="Ex: Use emojis de brilho ✨. Chame de 'flor'. Evite usar gírias muito pesadas."
                  className="w-full bg-transparent border-none p-0 text-base font-bold text-gray-700 focus:ring-0 placeholder:text-gray-300 leading-relaxed"
                />
              </div>
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
              value={config?.context_json.scheduling_rules.join('\n') || ''} 
              onChange={updateRules}
              placeholder="Ex: Cancelamento com 1h de antecedência. Não aceitamos menores sem autorização."
              className="w-full bg-transparent border-none p-0 text-base font-bold text-gray-700 focus:ring-0 placeholder:text-gray-300 leading-relaxed"
              rows={4}
            />
          </div>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5 ml-2">
            <Zap size={12} />
            Eliza utiliza estas regras para filtrar datas disponíveis.
          </p>
        </div>
      </div>

      {/* FLOAT SAVE BUTTON */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
        <button
          onClick={() => handleSubmit()}
          disabled={saving}
          className={`w-full h-16 rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl transition-all ${success ? 'bg-green-500' : 'bg-purple-600 shadow-purple-500/20'} text-white active:scale-95 disabled:opacity-50`}
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : success ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {saving ? 'Guardando...' : success ? 'Personalidade Salva!' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
}
