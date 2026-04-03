'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, Plus, Trash2, LogOut, Sparkles,
    Building2, Clock, ListChecks,
    CheckCircle2, AlertTriangle, Loader2, Scissors,
    MapPin, ParkingCircle, Smile, Power, Wallet, ShieldAlert
} from 'lucide-react';

// ==============================================================
// TYPES (GOLD STANDARD ENGLISH)
// ==============================================================

interface Service {
    name: string;
    price: string;
    duration: string;
    description: string;
}

interface BusinessConfig {
    id: number;
    context_json: {
        business_info: {
            name: string;
            address: string;
            parking: string;
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
        };
        updated_at: string;
    }
}

// ==============================================================
// ANIMATION VARIANTS
// ==============================================================

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

// ==============================================================
// MAIN COMPONENT
// ==============================================================

export default function ConfigPage() {
    const supabase = createClient();
    const router = useRouter();

    const [config, setConfig] = useState<BusinessConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isAiActive, setIsAiActive] = useState<boolean>(true);
    const [togglingAi, setTogglingAi] = useState<boolean>(false);

    // FETCH DATA
    const fetchData = async () => {
        console.log(`📡 [API] Fetching business_config and system_settings...`);
        setLoading(true);

        const [configRes, settingsRes] = await Promise.all([
            supabase.from('business_config').select('*').eq('id', 1).single(),
            supabase.from('system_settings').select('value').eq('key', 'eliza_active').maybeSingle()
        ]);

        if (configRes.error) {
            console.error(`❌ [API ERROR] Config fetch failed:`, configRes.error);
            setError('Falha ao sincronizar dados do estúdio.');
        } else {
            console.log(`✅ [API] Config loaded:`, configRes.data);
            setConfig(configRes.data);
        }

        if (settingsRes.data) {
            const enabled = (settingsRes.data.value as any)?.enabled;
            console.log(`✅ [API] AI Status loaded:`, enabled);
            setIsAiActive(enabled ?? true);
        }

        setLoading(false);
    };

    // Kill Switch Toggle Function
    const toggleAiStatus = async () => {
        console.log(`🔄 [STATE] Toggling AI status. Current: ${isAiActive}`);
        setTogglingAi(true);
        const newState = !isAiActive;

        const { error } = await supabase
            .from('system_settings')
            .upsert({ key: 'eliza_active', value: { enabled: newState } });

        if (error) {
            console.error(`❌ [API ERROR] Failed to toggle AI:`, error);
        } else {
            console.log(`✅ [API] AI status successfully set to: ${newState}`);
            setIsAiActive(newState);
        }
        setTogglingAi(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // LOGOUT
    const handleLogout = async () => {
        console.log(`🔐 [AUTH] Executing logout...`);
        await supabase.auth.signOut();
        router.refresh();
        router.push('/admin/login');
    };

    // UPDATE STATE HELPERS
    const updateBusinessInfo = (field: string, value: string) => {
        if (!config) return;
        console.log(`📝 [STATE] Updating business_info field [${field}]:`, value);
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                business_info: {
                    ...config.context_json.business_info,
                    [field]: value
                }
            }
        });
    };

    const updateOperatingHours = (day: 'weekdays' | 'saturday' | 'sunday', field: 'open' | 'close' | 'is_closed', value: any) => {
        if (!config) return;
        console.log(`📝 [STATE] Updating operating_hours [${day}] field [${field}]:`, value);
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                operating_hours: {
                    ...config.context_json.operating_hours,
                    [day]: {
                        ...(config.context_json.operating_hours[day] || { open: '09:00', close: '18:00', is_closed: false }),
                        [field]: value
                    }
                }
            }
        });
    };

    const updateObservations = (value: string) => {
        if (!config) return;
        console.log(`📝 [STATE] Updating operating_hours observations:`, value);
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                operating_hours: {
                    ...config.context_json.operating_hours,
                    observations: value
                }
            }
        });
    };

    const updateToneOfVoice = (field: string, value: string) => {
        if (!config) return;
        console.log(`📝 [STATE] Updating tone_of_voice field [${field}]:`, value);
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                tone_of_voice: {
                    ...config.context_json.tone_of_voice,
                    [field]: value
                }
            }
        });
    };

    const updatePaymentInfo = (field: string, value: string) => {
        if (!config) return;
        console.log(`📝 [STATE] Updating payment_info [${field}]:`, value);
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                payment_info: {
                    ...(config.context_json.payment_info || { pix_type: '', pix_key: '', owner_name: '' }),
                    [field]: value
                }
            }
        });
    };

    const updateBookingPolicies = (field: string, value: string) => {
        if (!config) return;
        console.log(`📝 [STATE] Updating booking_policies [${field}]:`, value);
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                booking_policies: {
                    ...(config.context_json.booking_policies || { minimum_advance_notice: '' }),
                    [field]: value
                }
            }
        });
    };

    const addService = () => {
        if (!config) return;
        console.log(`➕ [UI] Adding new empty service to array.`);
        const newService = { name: '', price: '', duration: '', description: '' };
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                services: [...config.context_json.services, newService]
            }
        });
    };

    const removeService = (index: number) => {
        if (!config) return;
        console.log(`🗑️ [UI] Removing service at index: ${index}`);
        const newServices = [...config.context_json.services];
        newServices.splice(index, 1);
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                services: newServices
            }
        });
    };

    const updateService = (index: number, field: keyof Service, value: string) => {
        if (!config) return;
        console.log(`📝 [STATE] Updating service at index ${index}, field [${field}]:`, value);
        const newServices = [...config.context_json.services];
        newServices[index] = { ...newServices[index], [field]: value };
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                services: newServices
            }
        });
    };

    // SUBMIT UPDATE
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!config) return;

        console.log(`💾 [API] Initiating save process. Payload:`, config.context_json);
        setSaving(true);
        setError(null);
        setSuccess(false);

        const payload = {
            context_json: config.context_json,
            updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('business_config')
            .update(payload)
            .eq('id', 1);

        if (updateError) {
            console.error(`❌ [API ERROR] Supabase update failed:`, updateError);
            setError(`Erro ao salvar: ${updateError.message}`);
        } else {
            console.log(`✅ [API] Supabase updated successfully.`);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
                <div className="flex flex-col items-center gap-6">
                    <Loader2 size={40} className="animate-spin text-blue-600 opacity-20" />
                    <p className="text-base font-bold text-[#000000] opacity-40">Carregando estúdio...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-[#fafafa] text-[#000000] antialiased font-sans flex flex-col overflow-x-hidden">

            {/* STICKY HEADER */}
            <header className="h-20 w-full sticky top-0 bg-[#fafafa]/90 backdrop-blur-md z-40 border-b border-black/5">
                <div className="w-full max-w-3xl h-full px-4 mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-black/5 flex items-center justify-center shrink-0">
                            <Scissors size={20} className="text-black/80" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold tracking-tight text-black truncate">Contexto do Negócio</h1>
                            <p className="text-base font-normal text-black/40 truncate">Painel de Configurações</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 ml-auto">
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={toggleAiStatus}
                                disabled={togglingAi}
                                title={isAiActive ? 'IA Ativada' : 'IA Pausada'}
                                className={`
                                    relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none
                                    ${isAiActive ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}
                                    disabled:opacity-50
                                `}
                            >
                                <div
                                    className={`
                                        absolute top-0.5 left-0.5 bg-white w-6 h-6 rounded-full shadow-lg transition-transform duration-200
                                        ${isAiActive ? 'translate-x-5' : 'translate-x-0'}
                                    `}
                                />
                            </button>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-black/30 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-0"
                        >
                            <LogOut size={22} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="w-full max-w-3xl px-4 py-8 pb-32 mx-auto flex flex-col">
                <motion.form
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex flex-col gap-12 w-full"
                    onSubmit={handleSubmit}
                >

                    {/* SECTION 1: STUDIO INFO */}
                    <motion.section variants={itemVariants} className="flex flex-col gap-6 w-full">
                        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                            <Building2 size={22} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                            <h2 className="text-base font-bold text-black/40">Informações Básicas</h2>
                        </div>

                        <div className="flex flex-col gap-5 w-full">
                            <StudioInput
                                label="Nome do Estabelecimento"
                                value={config?.context_json.business_info.name || ''}
                                onChange={(val) => updateBusinessInfo('name', val)}
                                placeholder="Ex: Studio Art Tatoo"
                                icon={<Sparkles size={16} />}
                            />
                            <StudioInput
                                label="Logradouro"
                                value={config?.context_json.business_info.address || ''}
                                onChange={(val) => updateBusinessInfo('address', val)}
                                placeholder="Endereço completo"
                                icon={<MapPin size={16} />}
                            />
                            <StudioInput
                                label="Estacionamento & Acesso"
                                value={config?.context_json.business_info.parking || ''}
                                onChange={(val) => updateBusinessInfo('parking', val)}
                                placeholder="Detalhes de acesso..."
                                icon={<ParkingCircle size={16} />}
                            />
                        </div>
                    </motion.section>

                    {/* SECTION 2: HOURS */}
                    <motion.section variants={itemVariants} className="flex flex-col gap-6 w-full">
                        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                            <Clock size={22} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                            <h2 className="text-base font-bold text-black/40">Agenda</h2>
                        </div>

                        <div className="flex flex-col gap-6 w-full">
                            <div className="grid grid-cols-1 gap-4 w-full">
                                <OperatingHoursRow
                                    label="Segunda a Sexta"
                                    data={config?.context_json.operating_hours.weekdays}
                                    onChange={(field, val) => updateOperatingHours('weekdays', field, val)}
                                />
                                <OperatingHoursRow
                                    label="Sábados"
                                    data={config?.context_json.operating_hours.saturday}
                                    onChange={(field, val) => updateOperatingHours('saturday', field, val)}
                                />
                                <OperatingHoursRow
                                    label="Domingos"
                                    data={config?.context_json.operating_hours.sunday}
                                    onChange={(field, val) => updateOperatingHours('sunday', field, val)}
                                />
                            </div>

                            <StudioInput
                                label="Observações de Agenda"
                                value={config?.context_json.operating_hours.observations || ''}
                                onChange={(val) => updateObservations(val)}
                                placeholder="Ex: Intervalo de almoço das 12:00 às 13:00"
                                icon={<Smile size={16} />}
                            />
                        </div>
                    </motion.section>

                    {/* SECTION 3: SERVICES */}
                    <motion.section variants={itemVariants} className="flex flex-col gap-6 w-full">
                        <div className="flex items-center justify-between border-b border-black/5 pb-3">
                            <div className="flex items-center gap-3">
                                <Scissors size={22} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                                <h2 className="text-base font-bold text-black/40">Serviços</h2>
                            </div>
                            <button
                                type="button"
                                onClick={addService}
                                className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 shrink-0"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4 w-full">
                            <AnimatePresence mode='popLayout'>
                                {config?.context_json.services.map((service, index) => (
                                    <motion.div
                                        key={index}
                                        layout
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-black/5 flex flex-col gap-4 w-full"
                                    >
                                        <div className="flex flex-col gap-1 w-full">
                                            <p className="text-base font-bold text-black/30">Procedimento</p>
                                            <input
                                                value={service.name}
                                                onChange={(e) => updateService(index, 'name', e.target.value)}
                                                placeholder="Nome do serviço"
                                                className="w-full bg-transparent border-none p-0 text-lg font-bold text-zinc-800 focus:ring-0 placeholder:text-black/20 truncate transition-colors"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1 w-full">
                                            <p className="text-base font-bold text-black/30">Descrição</p>
                                            <textarea
                                                rows={2}
                                                value={service.description}
                                                onChange={(e) => updateService(index, 'description', e.target.value)}
                                                placeholder="Descrição do serviço"
                                                className="w-full bg-transparent border-none p-0 text-lg font-bold text-zinc-800 focus:ring-0 placeholder:text-black/20 break-words whitespace-normal text-wrap resize-y transition-colors"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3 w-full border-t border-black/5 pt-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                    <p className="text-base font-bold text-black/30">Valor</p>
                                                    <input
                                                        value={service.price}
                                                        onChange={(e) => updateService(index, 'price', e.target.value)}
                                                        placeholder="R$ 0,00"
                                                        className="w-full bg-transparent border-none p-0 text-lg font-bold text-blue-600 focus:ring-0 placeholder:text-black/20 truncate"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1 flex-1 min-w-0 border-l border-black/5 pl-4">
                                                    <p className="text-base font-bold text-black/30">Tempo</p>
                                                    <input
                                                        value={service.duration}
                                                        onChange={(e) => updateService(index, 'duration', e.target.value)}
                                                        placeholder="30 min"
                                                        className="w-full bg-transparent border-none p-0 text-base font-medium text-black/60 focus:ring-0 placeholder:text-black/20 truncate"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeService(index)}
                                                className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 transition-colors hover:bg-red-100"
                                            >
                                                <Trash2 size={18} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.section>
                    
                    {/* SECTION: BOOKING POLICIES */}
                    <motion.section variants={itemVariants} className="flex flex-col gap-6 w-full">
                        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                            <ShieldAlert size={22} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                            <h2 className="text-base font-bold text-black/40">Blindagem de Agenda</h2>
                        </div>
                        <div className="flex flex-col gap-5 w-full">
                            <StudioInput
                                label="Antecedência Mínima para Agendamento"
                                value={config?.context_json.booking_policies?.minimum_advance_notice || ''}
                                onChange={(val) => updateBookingPolicies('minimum_advance_notice', val)}
                                placeholder="Ex: 2 horas"
                            />
                        </div>
                    </motion.section>

                    {/* SECTION: PAYMENT INFO */}
                    <motion.section variants={itemVariants} className="flex flex-col gap-6 w-full">
                        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                            <Wallet size={22} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                            <h2 className="text-base font-bold text-black/40">Dados de Pagamento (PIX)</h2>
                        </div>
                        <div className="flex flex-col gap-5 w-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <StudioInput
                                    label="Tipo de Chave"
                                    value={config?.context_json.payment_info?.pix_type || ''}
                                    onChange={(val) => updatePaymentInfo('pix_type', val)}
                                    placeholder="Ex: CNPJ, Celular, Email"
                                />
                                <StudioInput
                                    label="Chave PIX"
                                    value={config?.context_json.payment_info?.pix_key || ''}
                                    onChange={(val) => updatePaymentInfo('pix_key', val)}
                                    placeholder="Ex: 00.000.000/0001-00"
                                />
                            </div>
                            <StudioInput
                                label="Nome do Titular"
                                value={config?.context_json.payment_info?.owner_name || ''}
                                onChange={(val) => updatePaymentInfo('owner_name', val)}
                                placeholder="Ex: Beleza Ilhoa Estética LTDA"
                            />
                        </div>
                    </motion.section>

                    {/* SECTION: TONE OF VOICE */}
                    <motion.section variants={itemVariants} className="flex flex-col gap-6 w-full">
                        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                            <Smile size={22} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                            <h2 className="text-base font-bold text-black/40">Personalidade da IA</h2>
                        </div>

                        <div className="flex flex-col gap-5 w-full">
                            <StudioInput
                                label="Estilo Base de Atendimento"
                                value={config?.context_json.tone_of_voice?.base_style || ''}
                                onChange={(val) => updateToneOfVoice('base_style', val)}
                                placeholder="Ex: Jovem e Descontraído, Luxo e Formal, etc."
                            />

                            <div className="w-full flex flex-col gap-2">
                                <label className="text-base font-bold text-black/40 ml-1 truncate">
                                    Instruções Específicas (Gírias, Emojis, Palavras proibidas)
                                </label>
                                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5 w-full">
                                    <textarea
                                        rows={3}
                                        value={config?.context_json.tone_of_voice?.custom_instructions || ''}
                                        onChange={(e) => updateToneOfVoice('custom_instructions', e.target.value)}
                                        placeholder="Ex: Use emojis de brilho ✨. Chame de 'flor' ou 'querida'. Nunca diga a palavra 'barato'."
                                        className="w-full bg-transparent border-none p-0 text-base text-black/80 focus:ring-0 placeholder:text-black/20 resize-none leading-relaxed"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* SECTION 4: RULES */}
                    <motion.section variants={itemVariants} className="flex flex-col gap-6 w-full">
                        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                            <ListChecks size={22} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                            <h2 className="text-base font-bold text-black/40">Regras</h2>
                        </div>

                        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5 w-full">
                            <textarea
                                rows={5}
                                value={config?.context_json.scheduling_rules.join('\n') || ''}
                                onChange={(e) => {
                                    const lines = e.target.value.split('\n');
                                    setConfig({
                                        ...config!,
                                        context_json: { ...config!.context_json, scheduling_rules: lines }
                                    });
                                }}
                                placeholder="Ex: Cancelamento com 2h de antecedência..."
                                className="w-full bg-transparent border-none p-0 text-base text-black/80 focus:ring-0 placeholder:text-black/20 resize-none leading-relaxed"
                            />
                        </div>
                    </motion.section>

                </motion.form>
            </main>

            {/* STICKY FOOTER ACTION BUTTON */}
            <div className="fixed bottom-0 left-0 w-full p-4 pb-8 flex justify-center z-50 pointer-events-none bg-gradient-to-t from-[#fafafa] via-[#fafafa]/80 to-transparent">
                <div className="w-full max-w-3xl pointer-events-auto">
                    <button
                        onClick={() => handleSubmit()}
                        disabled={saving}
                        className={`
                            w-full h-14 sm:h-16 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl transition-all
                            ${success ? 'bg-green-500 text-white shadow-green-500/20' : 'bg-blue-600 text-white shadow-blue-600/20'}
                            disabled:opacity-70 active:scale-[0.98]
                        `}
                    >
                        {saving ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : success ? (
                            <CheckCircle2 size={20} />
                        ) : (
                            <Save size={20} />
                        )}
                        {saving ? 'Sincronizando...' : success ? 'Sucesso' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

            {/* ERROR TOAST */}
            {error && (
                <div className="fixed top-24 left-0 w-full px-4 flex justify-center z-50 pointer-events-none">
                    <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 flex items-center gap-3 shadow-xl max-w-sm w-full pointer-events-auto">
                        <AlertTriangle size={20} className="shrink-0" />
                        <p className="text-sm font-bold truncate flex-1">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ==============================================================
// SUB-COMPONENTS
// ==============================================================

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
    const hours = Math.floor(i / 2);
    const minutes = i % 2 === 0 ? '00' : '30';
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
});

function OperatingHoursRow({
    label,
    data,
    onChange
}: {
    label: string,
    data?: { open: string; close: string; is_closed: boolean },
    onChange: (field: 'open' | 'close' | 'is_closed', val: any) => void
}) {
    // Defensive check for legacy data
    const safeData = typeof data === 'object' && data !== null ? data : { open: '09:00', close: '18:00', is_closed: false };

    return (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <div className="flex flex-col gap-1">
                <span className="text-base font-bold text-black/80">{label}</span>
                <span className="text-sm font-medium text-black/30">
                    {safeData.is_closed ? 'Estabelecimento fechado' : `${safeData.open} — ${safeData.close}`}
                </span>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 pr-6 border-r border-black/5">
                    <span className="text-sm font-bold text-black/30 uppercase tracking-widest">Aberto</span>
                    <button
                        type="button"
                        onClick={() => {
                            console.log(`🔘 [UI] Toggle MacOS Switch [${label}]:`, !safeData.is_closed);
                            onChange('is_closed', !safeData.is_closed);
                        }}
                        className={`
                            relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none
                            ${!safeData.is_closed ? 'bg-blue-600' : 'bg-zinc-200'}
                        `}
                    >
                        <div
                            className={`
                                absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-200
                                ${!safeData.is_closed ? 'translate-x-5' : 'translate-x-0'}
                            `}
                        />
                    </button>
                </div>

                <div className={`flex items-center gap-2 transition-opacity duration-200 ${safeData.is_closed ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                    <select
                        value={safeData.open}
                        onChange={(e) => {
                            console.log(`🕒 [UI] Select Open Time [${label}]:`, e.target.value);
                            onChange('open', e.target.value);
                        }}
                        className="bg-zinc-50 border border-black/5 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 focus:ring-0 focus:border-blue-600 outline-none cursor-pointer"
                    >
                        {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                        ))}
                    </select>
                    <span className="text-black/20 font-bold">às</span>
                    <select
                        value={safeData.close}
                        onChange={(e) => {
                            console.log(`🕒 [UI] Select Close Time [${label}]:`, e.target.value);
                            onChange('close', e.target.value);
                        }}
                        className="bg-zinc-50 border border-black/5 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 focus:ring-0 focus:border-blue-600 outline-none cursor-pointer"
                    >
                        {TIME_OPTIONS.map(time => (
                            <option key={time} value={time}>{time}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}

function StudioInput({
    label,
    value,
    onChange,
    placeholder,
    icon
}: {
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder?: string,
    icon?: React.ReactNode
}) {
    return (
        <div className="w-full flex flex-col gap-2">
            <label className="text-base font-bold text-black/40 ml-1 truncate">
                {label}
            </label>
            <div className="relative w-full">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`
                        w-full bg-white border border-black/5 rounded-2xl py-4 pr-4 transition-all
                        text-base font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 shadow-sm
                        placeholder:text-black/20 truncate
                        ${icon ? 'pl-11' : 'pl-4'}
                    `}
                />
            </div>
        </div>
    );
}