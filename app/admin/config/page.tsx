'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save, Plus, Trash2, LogOut, Sparkles,
    Building2, Clock, ListChecks,
    CheckCircle2, AlertTriangle, Loader2, Scissors,
    MapPin, ParkingCircle
} from 'lucide-react';

// ==============================================================
// TYPES
// ==============================================================

interface Servico {
    nome: string;
    valor: string;
    duracao: string;
    descricao: string;
}

interface BusinessConfig {
    id: number;
    context_json: {
        informacoes_clinica: {
            name: string;
            address: string;
            parking: string;
        };
        horario_funcionamento: {
            "mon-fri": string;
            sat: string;
            sun: string;
            observations: string;
        };
        servicos: Servico[];
        regras_agendamento: string[];
        restricoes: string[];
    };
    updated_at: string;
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

    // FETCH DATA
    const fetchData = async () => {
        console.log(`📡 [API] Buscando dados do Supabase (business_config)...`);
        setLoading(true);
        const { data, error: fetchError } = await supabase
            .from('business_config')
            .select('*')
            .eq('id', 1)
            .single();

        if (fetchError) {
            console.error(`❌ [API ERROR] Falha no fetch:`, fetchError);
            setError('Falha ao sincronizar dados do estúdio.');
        } else {
            console.log(`✅ [API] Dados carregados com sucesso.`, data);
            setConfig(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // LOGOUT
    const handleLogout = async () => {
        console.log(`🔐 [AUTH] Executando logout...`);
        await supabase.auth.signOut();
        router.refresh();
        router.push('/admin/login');
    };

    // UPDATE STATE HELPERS
    const updateClinicInfo = (field: string, value: string) => {
        if (!config) return;
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                informacoes_clinica: {
                    ...config.context_json.informacoes_clinica,
                    [field]: value
                }
            }
        });
    };

    const updateHours = (field: string, value: string) => {
        if (!config) return;
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                horario_funcionamento: {
                    ...config.context_json.horario_funcionamento,
                    [field]: value
                }
            }
        });
    };

    const addService = () => {
        if (!config) return;
        console.log(`➕ [UI] Adicionando novo serviço vazio ao array.`);
        const newService = { nome: '', valor: '', duracao: '', descricao: '' };
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                servicos: [...config.context_json.servicos, newService]
            }
        });
    };

    const removeService = (index: number) => {
        if (!config) return;
        console.log(`🗑️ [UI] Removendo serviço no índice: ${index}`);
        const newServices = [...config.context_json.servicos];
        newServices.splice(index, 1);
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                servicos: newServices
            }
        });
    };

    const updateService = (index: number, field: keyof Servico, value: string) => {
        if (!config) return;
        const newServices = [...config.context_json.servicos];
        newServices[index] = { ...newServices[index], [field]: value };
        setConfig({
            ...config,
            context_json: {
                ...config.context_json,
                servicos: newServices
            }
        });
    };

    // SUBMIT UPDATE
    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!config) return;

        console.log(`💾 [API] Iniciando processo de salvamento... payload:`, config.context_json);
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
            console.error(`❌ [API ERROR] Falha ao atualizar Supabase:`, updateError);
            setError(`Erro ao salvar: ${updateError.message}`);
        } else {
            console.log(`✅ [API] Supabase atualizado com sucesso.`);
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

                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-black/30 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 ml-4"
                    >
                        <LogOut size={22} strokeWidth={1.5} />
                    </button>
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
                                value={config?.context_json.informacoes_clinica.name || ''}
                                onChange={(val) => updateClinicInfo('name', val)}
                                placeholder="Ex: Studio Art Tatoo"
                                icon={<Sparkles size={16} />}
                            />
                            <StudioInput
                                label="Logradouro"
                                value={config?.context_json.informacoes_clinica.address || ''}
                                onChange={(val) => updateClinicInfo('address', val)}
                                placeholder="Endereço completo"
                                icon={<MapPin size={16} />}
                            />
                            <StudioInput
                                label="Estacionamento & Acesso"
                                value={config?.context_json.informacoes_clinica.parking || ''}
                                onChange={(val) => updateClinicInfo('parking', val)}
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
                            <StudioInput
                                label="Segunda a Sexta"
                                value={config?.context_json.horario_funcionamento["mon-fri"] || ''}
                                onChange={(val) => updateHours('mon-fri', val)}
                                placeholder="09:00 - 19:00"
                            />
                            <StudioInput
                                label="Sábados"
                                value={config?.context_json.horario_funcionamento.sat || ''}
                                onChange={(val) => updateHours('sat', val)}
                                placeholder="09:00 - 15:00"
                            />
                            <StudioInput
                                label="Domingos"
                                value={config?.context_json.horario_funcionamento.sun || ''}
                                onChange={(val) => updateHours('sun', val)}
                                placeholder="Fechado"
                            />
                            <StudioInput
                                label="Observações"
                                value={config?.context_json.horario_funcionamento.observations || ''}
                                onChange={(val) => updateHours('observations', val)}
                                placeholder="Intervalo de almoço as 12:00"
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
                                {config?.context_json.servicos.map((servico, index) => (
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
                                                value={servico.nome}
                                                onChange={(e) => updateService(index, 'nome', e.target.value)}
                                                placeholder="Nome do serviço"
                                                className="w-full bg-transparent border-none p-0 text-lg font-bold text-zinc-800 focus:ring-0 placeholder:text-black/20 truncate transition-colors"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1 w-full">
                                            <p className="text-base font-bold text-black/30">Descrição</p>
                                            <textarea
                                                rows={2}
                                                value={servico.descricao}
                                                onChange={(e) => updateService(index, 'descricao', e.target.value)}
                                                placeholder="Descrição do serviço"
                                                className="w-full bg-transparent border-none p-0 text-lg font-bold text-zinc-800 focus:ring-0 placeholder:text-black/20 break-words whitespace-normal text-wrap resize-y transition-colors"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3 w-full border-t border-black/5 pt-4">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                    <p className="text-base font-bold text-black/30">Valor</p>
                                                    <input
                                                        value={servico.valor}
                                                        onChange={(e) => updateService(index, 'valor', e.target.value)}
                                                        placeholder="R$ 0,00"
                                                        className="w-full bg-transparent border-none p-0 text-lg font-bold text-blue-600 focus:ring-0 placeholder:text-black/20 truncate"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1 flex-1 min-w-0 border-l border-black/5 pl-4">
                                                    <p className="text-base font-bold text-black/30">Tempo</p>
                                                    <input
                                                        value={servico.duracao}
                                                        onChange={(e) => updateService(index, 'duracao', e.target.value)}
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

                    {/* SECTION 4: RULES */}
                    <motion.section variants={itemVariants} className="flex flex-col gap-6 w-full">
                        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
                            <ListChecks size={22} strokeWidth={1.5} className="text-blue-600 shrink-0" />
                            <h2 className="text-base font-bold text-black/40">Regras</h2>
                        </div>

                        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5 w-full">
                            <textarea
                                rows={5}
                                value={config?.context_json.regras_agendamento.join('\n') || ''}
                                onChange={(e) => {
                                    const lines = e.target.value.split('\n');
                                    setConfig({
                                        ...config!,
                                        context_json: { ...config!.context_json, regras_agendamento: lines }
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