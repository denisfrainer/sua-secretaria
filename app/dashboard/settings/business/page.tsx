'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Plus, Trash2, 
  Building2, Clock, 
  CheckCircle2, AlertTriangle, Loader2, Scissors,
  MapPin, ParkingCircle, Smile, Wallet, ShieldAlert,
  MessageCircleQuestion
} from 'lucide-react';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';
import { OperatingHoursRow } from '@/components/dashboard/settings/OperatingHoursRow';
import { AutoResizeTextarea } from '@/components/dashboard/settings/AutoResizeTextarea';

// ==============================================================
// TYPES
// ==============================================================

interface Service {
  name: string;
  price: string;
  duration: string;
  description: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface BusinessConfig {
  id: number;
  owner_id: string;
  context_json: {
    business_info: {
      name: string;
      address: string;
      parking: string;
      handoff_phone: string;
    };
    operating_hours: {
      weekdays: { open: string; close: string; is_closed: boolean };
      saturday: { open: string; close: string; is_closed: boolean };
      sunday: { open: string; close: string; is_closed: boolean };
      observations: string;
    };
    services: Service[];
    scheduling_rules: string[];
    restrictions: string[];
    tone_of_voice: {
      base_style: string;
      custom_instructions: string;
    };
    payment_info: {
      pix_type: string;
      pix_key: string;
      owner_name: string;
    };
    booking_policies: {
      minimum_advance_notice: string;
      buffer_time_minutes: string;
    };
    faq: FAQItem[];
    updated_at: string;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export default function BusinessSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('business_config')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (data) {
        setConfig(data);
      } else {
        // Initialize local state for a NEW business profile
        setConfig({
          id: 0, // Temporary ID
          owner_id: user.id,
          context_json: {
            business_info: { name: '', address: '', parking: '', handoff_phone: '' },
            operating_hours: {
              weekdays: { open: "09:00", close: "18:00", is_closed: false },
              saturday: { open: "09:00", close: "13:00", is_closed: false },
              sunday: { open: "00:00", close: "00:00", is_closed: true },
              observations: ""
            },
            services: [],
            scheduling_rules: [],
            restrictions: [],
            tone_of_voice: { base_style: "Amigável e profissional", custom_instructions: "Responda de forma natural." },
            payment_info: { pix_type: "", pix_key: "", owner_name: "" },
            booking_policies: { minimum_advance_notice: "2 horas", buffer_time_minutes: "15" },
            faq: [],
            updated_at: new Date().toISOString()
          }
        } as any);
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase, router]);

  // UPDATE HELPERS
  const updateBusinessInfo = (field: string, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      context_json: {
        ...config.context_json,
        business_info: { ...config.context_json.business_info, [field]: value }
      }
    });
  };

  const updateOperatingHours = (day: 'weekdays' | 'saturday' | 'sunday', field: 'open' | 'close' | 'is_closed', value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      context_json: {
        ...config.context_json,
        operating_hours: {
          ...config.context_json.operating_hours,
          [day]: { ...(config.context_json.operating_hours[day]), [field]: value }
        }
      }
    });
  };

  const updateService = (index: number, field: keyof Service, value: string) => {
    if (!config) return;
    const newServices = [...config.context_json.services];
    newServices[index] = { ...newServices[index], [field]: value };
    setConfig({
      ...config,
      context_json: { ...config.context_json, services: newServices }
    });
  };

  const updateFaq = (index: number, field: keyof FAQItem, value: string) => {
    if (!config) return;
    const newFaq = [...(config.context_json.faq || [])];
    newFaq[index] = { ...newFaq[index], [field]: value };
    setConfig({
      ...config,
      context_json: { ...config.context_json, faq: newFaq }
    });
  };

  const generateInstanceName = (name: string) => {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `${slug || 'studio'}-${randomSuffix}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;

    if (!config.context_json.business_info.name.trim()) {
      setError("O nome da empresa é obrigatório para começar.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let finalConfig = config;

      // 1. If ID is 0, this is a NEW business -> Initial Setup Flow
      if (config.id === 0) {
        console.log('🚀 [SETUP] Initializing new business config...');
        const instanceName = generateInstanceName(config.context_json.business_info.name);

        // a. Initialize instance via Evolution wrapper
        const initRes = await fetch('/api/instance/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName })
        });
        
        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.error || "Erro ao inicializar IA.");

        // b. Insert into Supabase
        const { data: insertedData, error: insertError } = await supabase
          .from('business_config')
          .insert({
              owner_id: user.id,
              instance_name: instanceName,
              context_json: config.context_json
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (insertedData) setConfig(insertedData);

      } else {
        // 2. Existing business -> Standard Update Flow
        const { error: updateError } = await supabase
          .from('business_config')
          .update({
            context_json: config.context_json,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id);

        if (updateError) throw updateError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
      
    } catch (err: any) {
      console.error(err);
      setError(`Erro ao salvar: ${err.message}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600 opacity-20" size={32} /></div>;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-12 pb-32"
    >
      {/* SECTION 1: STUDIO INFO */}
      <motion.section variants={itemVariants} className="flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
          <Building2 size={20} className="text-blue-600 shrink-0" />
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Informações Básicas</h2>
        </div>
        <div className="grid grid-cols-1 gap-5">
          <StudioInput 
            label="Nome do Estabelecimento" 
            value={config?.context_json.business_info.name || ''} 
            onChange={(val) => updateBusinessInfo('name', val)}
            icon={<Building2 size={16} />}
          />
          <StudioInput 
            label="Endereço" 
            value={config?.context_json.business_info.address || ''} 
            onChange={(val) => updateBusinessInfo('address', val)}
            icon={<MapPin size={16} />}
          />
          <StudioInput 
            label="Acesso / Estacionamento" 
            value={config?.context_json.business_info.parking || ''} 
            onChange={(val) => updateBusinessInfo('parking', val)}
            icon={<ParkingCircle size={16} />}
          />
        </div>
      </motion.section>

      {/* SECTION 2: HOURS */}
      <motion.section variants={itemVariants} className="flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
          <Clock size={20} className="text-blue-600 shrink-0" />
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Horário de Funcionamento</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <OperatingHoursRow label="Segunda a Sexta" data={config?.context_json.operating_hours.weekdays} onChange={(f, v) => updateOperatingHours('weekdays', f, v)} />
          <OperatingHoursRow label="Sábados" data={config?.context_json.operating_hours.saturday} onChange={(f, v) => updateOperatingHours('saturday', f, v)} />
          <OperatingHoursRow label="Domingos" data={config?.context_json.operating_hours.sunday} onChange={(f, v) => updateOperatingHours('sunday', f, v)} />
        </div>
      </motion.section>

      {/* SECTION 3: SERVICES */}
      <motion.section variants={itemVariants} className="flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div className="flex items-center gap-3">
            <Scissors size={20} className="text-blue-600 shrink-0" />
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Procedimentos</h2>
          </div>
          <button 
            type="button" 
            onClick={() => setConfig({
              ...config!,
              context_json: { ...config!.context_json, services: [...config!.context_json.services, { name: '', price: '', duration: '', description: '' }] }
            })}
            className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200"
          >
            <Plus size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {config?.context_json.services.map((service, index) => (
              <motion.div key={index} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white rounded-3xl p-6 shadow-sm border border-black/5 flex flex-col gap-4">
                <StudioInput label="Serviço" value={service.name} onChange={(v) => updateService(index, 'name', v)} />
                <AutoResizeTextarea label="Descrição" value={service.description} onChange={(v) => updateService(index, 'description', v)} className="w-full bg-transparent border-none p-0 text-base font-bold text-gray-600 focus:ring-0 placeholder:text-gray-300" />
                <div className="flex gap-4 pt-2 border-t border-black/5">
                  <StudioInput label="Preço" value={service.price} onChange={(v) => updateService(index, 'price', v)} />
                  <StudioInput label="Duração" value={service.duration} onChange={(v) => updateService(index, 'duration', v)} />
                  <button type="button" onClick={() => {
                    const newServices = [...config!.context_json.services];
                    newServices.splice(index, 1);
                    setConfig({ ...config!, context_json: { ...config!.context_json, services: newServices } });
                  }} className="mt-6 w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center shrink-0"><Trash2 size={18} /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.section>

      {/* FLOAT SAVE BUTTON */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
        <button
          onClick={() => handleSubmit()}
          disabled={saving}
          className={`w-full h-16 rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl transition-all ${success ? 'bg-green-500' : 'bg-blue-600'} text-white active:scale-95 disabled:opacity-50`}
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : success ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {saving ? 'Salvando...' : success ? 'Sucesso!' : 'Salvar Alterações'}
        </button>
      </div>
    </motion.div>
  );
}
