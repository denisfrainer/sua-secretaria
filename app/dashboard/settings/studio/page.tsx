'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Plus, Trash2,
  Building2, Clock,
  CheckCircle2, AlertTriangle, Loader2,
  MapPin, ParkingCircle, Smile, Wallet, ShieldAlert,
  MessageCircleQuestion, Link2, TrendingUp,
  ArrowLeft, List, Scissors, DollarSign, Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { StudioInput } from '@/components/dashboard/settings/StudioInput';
import { OperatingHoursRow } from '@/components/dashboard/settings/OperatingHoursRow';
import { AutoResizeTextarea } from '@/components/dashboard/settings/AutoResizeTextarea';
import { MockLogoUpload } from '@/components/dashboard/settings/MockLogoUpload';

// ==============================================================
// TYPES
// ==============================================================

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  description: string;
  status: 'active' | 'inactive';
}

interface FAQItem {
  question: string;
  answer: string;
}

interface BusinessConfig {
  id: number;
  enable_smart_scarcity: boolean;
  context_json: {
    business_info: {
      name: string;
      address: string;
      parking: string;
      handoff_phone: string;
      description: string;
    };
    operating_hours: {
      weekdays: { open: string; close: string; is_closed: boolean };
      saturday: { open: string; close: string; is_closed: boolean };
      sunday: { open: string; close: string; is_closed: boolean };
      lunch_interval: { open: string; close: string; enabled: boolean };
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

import { MinimalistHeader } from '@/components/dashboard/MinimalistHeader';

export default function BusinessSettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [activeTab, setActiveTab] = useState<'studio' | 'services'>('studio');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('business_config')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ [STUDIO_FETCH] Error fetching config:', error);
        setError(`Erro ao carregar configurações: ${error.message}`);
        return;
      }

      if (data) {
        console.log('📡 [STUDIO_FETCH] Config loaded:', data.id);
        setConfig(data);
      } else {
        console.log('📡 [STUDIO_FETCH] No config found, initializing default...');
        setConfig({
          id: 0,
          owner_id: user.id,
          context_json: {
            business_info: { name: '', address: '', parking: '', handoff_phone: '', description: '' },
            operating_hours: {
              weekdays: { open: "09:00", close: "18:00", is_closed: false },
              saturday: { open: "09:00", close: "13:00", is_closed: false },
              sunday: { open: "00:00", close: "00:00", is_closed: true },
              lunch_interval: { open: "12:00", close: "13:00", enabled: false },
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

      // Fetch Slug
      const { data: profile } = await supabase
        .from('profiles')
        .select('slug')
        .eq('id', user.id)
        .single();

      if (profile?.slug) {
        setSlug(profile.slug);
        setOriginalSlug(profile.slug);
      }
    } catch (err: any) {
      console.error('❌ [STUDIO_FETCH] Catch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [supabase]);

  // UPDATE HELPERS
  const updateBusinessInfo = (field: string, value: string) => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        context_json: {
          ...prev.context_json,
          business_info: { ...(prev.context_json?.business_info || {}), [field]: value }
        }
      };
    });
  };

  const updateOperatingHours = (day: 'weekdays' | 'saturday' | 'sunday', field: 'open' | 'close' | 'is_closed', value: any) => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        context_json: {
          ...prev.context_json,
          operating_hours: {
            ...(prev.context_json?.operating_hours || {}),
            [day]: { ...(prev.context_json?.operating_hours?.[day] || {}), [field]: value }
          }
        }
      };
    });
  };

  const updateLunchInterval = (field: 'open' | 'close' | 'enabled', value: any) => {
    if (!config) return;
    setConfig({
      ...config,
      context_json: {
        ...config.context_json,
        operating_hours: {
          ...(config.context_json?.operating_hours || {}),
          lunch_interval: { ...(config.context_json?.operating_hours?.lunch_interval || { open: '12:00', close: '13:00', enabled: false }), [field]: value }
        }
      }
    });
  };

  const updateFaq = (index: number, field: keyof FAQItem, value: string) => {
    setConfig(prev => {
      if (!prev) return prev;
      const newFaq = [...(prev.context_json?.faq || [])];
      newFaq[index] = { ...(newFaq[index] || {}), [field]: value } as any;
      return {
        ...prev,
        context_json: { ...(prev.context_json || {}), faq: newFaq } as any
      };
    });
  };

  const updateScarcity = (value: boolean) => {
    if (!config) return;
    setConfig({ ...config, enable_smart_scarcity: value });
  };

  const updateBookingPolicy = (field: keyof BusinessConfig['context_json']['booking_policies'], value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      context_json: {
        ...config.context_json,
        booking_policies: {
          ...(config.context_json?.booking_policies || { minimum_advance_notice: '2 horas', buffer_time_minutes: '15' }),
          [field]: value
        }
      }
    });
  };

  const updatePaymentInfo = (field: keyof BusinessConfig['context_json']['payment_info'], value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      context_json: {
        ...config.context_json,
        payment_info: {
          ...(config.context_json?.payment_info || { pix_type: 'CPF', pix_key: '', owner_name: '' }),
          [field]: value
        }
      }
    });
  };

  const updateServices = (newServices: Service[]) => {
    setConfig(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        context_json: { ...(prev.context_json || {}), services: newServices }
      };
    });
  };

  const addService = () => {
    const newService: Service = {
      id: crypto.randomUUID(),
      name: '',
      price: 0,
      duration: 30,
      description: '',
      status: 'active'
    };
    updateServices([...(config?.context_json?.services || []), newService]);
  };

  const removeService = (id: string) => {
    updateServices((config?.context_json?.services || []).filter(s => s.id !== id));
  };

  const updateServiceField = (id: string, field: keyof Service, value: any) => {
    updateServices((config?.context_json?.services || []).map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const generateInstanceName = (name: string) => {
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
    const prefix = process.env.NEXT_PUBLIC_INSTANCE_NAME || 'secretaria';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `${prefix}-${slug || 'studio'}-${randomSuffix}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;

    if (!config?.context_json?.business_info?.name?.trim()) {
      setError("O nome da empresa é obrigatório para começar.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setError(null);
    console.log('💾 [STUDIO_SAVE] Attempting to save config:', config);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // 1. If ID is 0, this is a NEW business -> Initial Setup Flow
      if (config.id === 0) {
        console.log('🚀 [SETUP] Initializing new business config...');
        const businessName = config?.context_json?.business_info?.name || 'Minha Empresa';
        const instanceName = generateInstanceName(businessName);

        // a. Initialize instance via Evolution wrapper
        const initRes = await fetch('/api/instance/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instanceName,
            tenantId: user.id
          })
        });

        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.error || "Erro ao inicializar IA.");

        // b. Insert into Supabase
        const { data: insertedData, error: insertError } = await supabase
          .from('business_config')
          .insert({
            owner_id: user.id,
            instance_name: instanceName,
            context_json: config.context_json,
            enable_smart_scarcity: config.enable_smart_scarcity
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
            enable_smart_scarcity: config.enable_smart_scarcity,
            updated_at: new Date().toISOString()
          })
          .eq('id', config.id);

        if (updateError) {
          console.error('❌ [STUDIO_SAVE] Update error:', updateError);
          throw updateError;
        }
        console.log('✅ [STUDIO_SAVE] Update successful for ID:', config.id);
      }

      // 3. Update Slug in Profiles (only if changed)
      if (slug && slug !== originalSlug) {
        console.log(`[SLUG_UPDATE] Attempting to update slug:`, {
          userId: user.id,
          newSlug: slug,
          timestamp: new Date().toISOString()
        });

        // Clean slug again just in case
        const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').trim();

        const { error: slugError } = await supabase
          .from('profiles')
          .update({ slug: cleanSlug || null })
          .eq('id', user.id);

        if (slugError) {
          if (slugError.code === '23505') {
            throw new Error("Este link já está sendo usado por outro profissional.");
          }
          throw slugError;
        }
        setOriginalSlug(cleanSlug);
      }


      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
      // Re-fetch to sync state
      await fetchData();
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
      className="flex flex-col gap-2 pb-32 overflow-x-hidden"
    >
      {/* Header with Back Button */}
      <motion.div variants={itemVariants} className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center shrink-0 hover:bg-gray-50 transition-all active:scale-95"
          >
            <ArrowLeft size={20} className="text-gray-900" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black text-gray-950 tracking-tight leading-none">Configuração do negócio</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">
              ESTABELECIMENTO & SERVIÇOS
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div variants={itemVariants} className="flex bg-slate-100 p-1.5 rounded-2xl w-fit mb-4">
        <button
          onClick={() => setActiveTab('studio')}
          className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'studio' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Studio
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'services' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Serviços
        </button>
      </motion.div>

      {activeTab === 'studio' ? (
        <div className="flex flex-col gap-10">
          <div className="h-4" /> {/* Spacer */}
          {/* SECTION 1: STUDIO INFO */}
          <motion.section variants={itemVariants} className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-3">
              <Building2 size={20} className="text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Informações Básicas</h2>
            </div>

            {/* LOGO UPLOAD (MOCKED) */}
            <MockLogoUpload
              currentUrl={(config?.context_json as any)?.business_info?.logo_url}
              onUploadComplete={(base64) => updateBusinessInfo('logo_url', base64)}
            />

            <div className="grid grid-cols-1 gap-5">
              <StudioInput
                label="Nome do Estabelecimento"
                value={config?.context_json?.business_info?.name || ''}
                onChange={(val) => updateBusinessInfo('name', val)}
                icon={<Building2 size={16} />}
              />
              <StudioInput
                label="Endereço"
                value={config?.context_json?.business_info?.address || ''}
                onChange={(val) => updateBusinessInfo('address', val)}
                icon={<MapPin size={16} />}
              />
              <StudioInput
                label="Complemento"
                value={config?.context_json?.business_info?.parking || ''}
                onChange={(val) => updateBusinessInfo('parking', val)}
                icon={<ParkingCircle size={16} />}
              />
              <div className="flex flex-col gap-2">
                <AutoResizeTextarea 
                  label="História da empresa" 
                  placeholder="Conte um pouco sobre sua trajetória, especialidades e o que torna seu atendimento único. Isso ajudará a IA a atender melhor seus clientes."
                  value={config?.context_json?.business_info?.description || ''} 
                  onChange={(val) => updateBusinessInfo('description', val)}
                />
              </div>
            </div>
          </motion.section>

          {/* SECTION 2: HOURS */}
          <motion.section variants={itemVariants} className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-3">
              <Clock size={20} className="text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Horário de Funcionamento</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <OperatingHoursRow label="Segunda a Sexta" data={config?.context_json?.operating_hours?.weekdays} onChange={(f, v) => updateOperatingHours('weekdays', f, v)} />
              <OperatingHoursRow label="Sábados" data={config?.context_json?.operating_hours?.saturday} onChange={(f, v) => updateOperatingHours('saturday', f, v)} />
              <OperatingHoursRow label="Domingos" data={config?.context_json?.operating_hours?.sunday} onChange={(f, v) => updateOperatingHours('sunday', f, v)} />

              {/* LUNCH INTERVAL CARD */}
              <div className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all ${config?.context_json?.operating_hours?.lunch_interval?.enabled ? 'border-blue-600/20 bg-blue-50/5' : 'border-black/5'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full mt-4`}>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold text-gray-900">Intervalo de Almoço</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {config?.context_json?.operating_hours?.lunch_interval?.enabled
                      ? `${config?.context_json?.operating_hours?.lunch_interval?.open} — ${config?.context_json?.operating_hours?.lunch_interval?.close}`
                      : 'Desativado'}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 w-full sm:w-auto">
                  <div className="flex items-center gap-3 sm:pr-6 sm:border-r border-black/5">
                    <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Ativar</span>
                    <button
                      type="button"
                      onClick={() => updateLunchInterval('enabled', !config?.context_json?.operating_hours?.lunch_interval?.enabled)}
                      className={`
                    relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
                    ${config?.context_json?.operating_hours?.lunch_interval?.enabled ? 'bg-blue-600' : 'bg-gray-200'}
                  `}
                    >
                      <div
                        className={`
                      absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200
                      ${config?.context_json?.operating_hours?.lunch_interval?.enabled ? 'translate-x-5' : 'translate-x-0'}
                    `}
                      />
                    </button>
                  </div>

                  <div className={`flex items-center gap-1.5 transition-opacity duration-200 ${!config?.context_json?.operating_hours?.lunch_interval?.enabled ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                    <select
                      value={config?.context_json?.operating_hours?.lunch_interval?.open || '12:00'}
                      onChange={(e) => updateLunchInterval('open', e.target.value)}
                      className="bg-gray-50 border border-black/5 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none cursor-pointer focus:border-blue-600/20"
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const hours = Math.floor(i / 2);
                        const minutes = i % 2 === 0 ? '00' : '30';
                        const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
                    <span className="text-gray-300 font-bold text-xs">até</span>
                    <select
                      value={config?.context_json?.operating_hours?.lunch_interval?.close || '13:00'}
                      onChange={(e) => updateLunchInterval('close', e.target.value)}
                      className="bg-gray-50 border border-black/5 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none cursor-pointer focus:border-blue-600/20"
                    >
                      {Array.from({ length: 48 }, (_, i) => {
                        const hours = Math.floor(i / 2);
                        const minutes = i % 2 === 0 ? '00' : '30';
                        const time = `${hours.toString().padStart(2, '0')}:${minutes}`;
                        return <option key={time} value={time}>{time}</option>;
                      })}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SECTION 3: CONVERSION / SCARCITY */}
          <motion.section variants={itemVariants} className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-3">
              <TrendingUp size={20} className="text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Alta Conversão</h2>
            </div>

            <div
              onClick={() => updateScarcity(!config?.enable_smart_scarcity)}
              className={`group flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${config?.enable_smart_scarcity
                ? 'bg-blue-50/50 border-blue-600/20 shadow-xl shadow-blue-500/5'
                : 'bg-white border-gray-100 hover:border-gray-200'
                }`}
            >
              <div className="flex flex-col gap-1 max-w-[80%]">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                  Modo Agenda Disputada
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-black ${config?.enable_smart_scarcity ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                    {config?.enable_smart_scarcity ? 'Ativo' : 'OFF'}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Oculta estrategicamente alguns horários vazios para gerar prova social e acelerar a decisão do cliente.
                </p>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${config?.enable_smart_scarcity ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${config?.enable_smart_scarcity ? 'left-7' : 'left-1'}`} />
              </div>
            </div>
          </motion.section>

          {/* SECTION 4: BUSINESS RULES */}
          <motion.section variants={itemVariants} className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-3">
              <ShieldAlert size={20} className="text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Regras do Negócio</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  Antecedência Mínima para Agendamento
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                    <Clock size={16} />
                  </div>
                  <select
                    value={config?.context_json?.booking_policies?.minimum_advance_notice || '2 horas'}
                    onChange={(e) => updateBookingPolicy('minimum_advance_notice', e.target.value)}
                    className="w-full h-14 bg-gray-50 rounded-2xl pl-12 pr-4 text-sm font-bold text-gray-700 border-2 border-transparent focus:border-blue-600/20 outline-none appearance-none transition-all"
                  >
                    <option value="Sem antecedência">Sem antecedência (Imediato)</option>
                    <option value="30 minutos">30 minutos</option>
                    <option value="1 hora">1 hora</option>
                    <option value="2 horas">2 horas</option>
                    <option value="3 horas">3 horas</option>
                    <option value="4 horas">4 horas</option>
                    <option value="6 horas">6 horas</option>
                    <option value="12 horas">12 horas</option>
                    <option value="24 horas">24 horas (1 dia)</option>
                    <option value="48 horas">48 horas (2 dias)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-300">
                    <TrendingUp size={14} className="rotate-90" />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-gray-400 px-1">
                  Tempo mínimo necessário entre o agendamento e o horário do serviço.
                </p>
              </div>
            </div>
          </motion.section>

          {/* SECTION 5: PAYMENT PIX */}
          <motion.section variants={itemVariants} className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-3">
              <Wallet size={20} className="text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Pagamento PIX</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Tipo de Chave
                  </label>
                  <select
                    value={config?.context_json?.payment_info?.pix_type || 'CPF'}
                    onChange={(e) => updatePaymentInfo('pix_type', e.target.value)}
                    className="w-full h-14 bg-gray-50 rounded-2xl px-4 text-sm font-bold text-gray-700 border-2 border-transparent focus:border-blue-600/20 outline-none appearance-none transition-all"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Celular">Celular</option>
                    <option value="Chave Aleatória">Chave Aleatória</option>
                  </select>
                </div>
                <div className="flex-[2] space-y-2">
                  <StudioInput
                    label="Chave PIX"
                    placeholder="Sua chave pix aqui"
                    value={config?.context_json?.payment_info?.pix_key || ''}
                    onChange={(val) => updatePaymentInfo('pix_key', val)}
                    icon={<DollarSign size={16} />}
                  />
                </div>
              </div>

              <StudioInput
                label="Nome do Titular"
                placeholder="Nome como aparece no banco"
                value={config?.context_json?.payment_info?.owner_name || ''}
                onChange={(val) => updatePaymentInfo('owner_name', val)}
                icon={<Building2 size={16} />}
              />

              <div className="space-y-4 pt-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  QR Code PIX (Opcional)
                </label>
                <div className="w-full h-48 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-3 group hover:bg-gray-100/50 hover:border-gray-200 transition-all cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Plus size={20} className="text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Upload QR Code</p>
                    <p className="text-[10px] text-gray-300 font-bold">Arraste a foto ou clique para buscar</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* SECTION 6: COMPANY PHOTOS (MOCKED) */}
          <motion.section variants={itemVariants} className="flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-black/5 pb-3">
              <ImageIcon size={20} className="text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Fotos do Studio</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i}
                  className="aspect-square rounded-[2rem] bg-gray-50 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-100/50 hover:border-gray-200 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Plus size={18} className="text-gray-400" />
                  </div>
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Foto {i + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-gray-400 text-center uppercase tracking-widest">
              FORMATO RECOMENDADO: 1:1 (QUADRADO)
            </p>
          </motion.section>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <div className="flex items-center gap-3">
              <List size={20} className="text-blue-600 shrink-0" />
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Seus Serviços</h2>
            </div>
            <button
              onClick={addService}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95"
            >
              <Plus size={14} />
              Novo Serviço
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {(config?.context_json?.services || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-200 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-4">
                  <Scissors size={32} />
                </div>
                <p className="text-gray-400 font-semibold">Nenhum serviço cadastrado.</p>
                <button
                  onClick={addService}
                  className="mt-4 text-blue-600 font-bold uppercase tracking-widest text-[10px] hover:underline"
                >
                  Começar agora
                </button>
              </div>
            ) : (
              (config?.context_json?.services || []).map((service) => (
                <motion.div
                  layout
                  key={service.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 relative flex flex-col gap-5"
                >
                  {/* Delete Action (Trash Icon Top-Right) */}
                  <button
                    onClick={() => removeService(service.id)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-red-600 transition-colors p-2"
                    title="Excluir serviço"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="flex flex-col gap-5">
                    {/* PHOTO UPLOAD (COMPACT RECTANGULAR) */}
                    <div className="w-full h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors group cursor-pointer">
                      <Plus size={20} className="text-gray-400 group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs font-medium">Upload Foto</span>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 pl-1">
                          Nome do Serviço
                        </label>
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => updateServiceField(service.id, 'name', e.target.value)}
                          className="bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full h-10 px-3 transition-all text-sm font-medium"
                          placeholder="Ex: Corte de Cabelo"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 pl-1">
                            Preço (R$)
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              <DollarSign size={14} />
                            </div>
                            <input
                              type="number"
                              value={service.price}
                              onChange={(e) => updateServiceField(service.id, 'price', Number(e.target.value))}
                              className="bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full h-10 pl-8 pr-3 transition-all text-sm font-medium"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 pl-1">
                            Duração (min)
                          </label>
                          <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                              <Clock size={14} />
                            </div>
                            <input
                              type="number"
                              value={service.duration}
                              onChange={(e) => updateServiceField(service.id, 'duration', Number(e.target.value))}
                              className="bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full h-10 pl-8 pr-3 transition-all text-sm font-medium"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 pl-1">
                      Descrição (Opcional)
                    </label>
                    <textarea
                      value={service.description}
                      onChange={(e) => updateServiceField(service.id, 'description', e.target.value)}
                      placeholder="Breve descrição do serviço..."
                      className="bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full px-3 py-2.5 transition-all text-sm font-medium resize-none h-20"
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}


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
