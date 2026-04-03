'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import {
    Home,
    DollarSign,
    Users,
    Clock,
    Calendar,
    Link2,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    HelpCircle,
    ShieldCheck,
    Save,
    Palmtree,
    Sparkles,
} from 'lucide-react';

// ==============================================================
// TYPES
// ==============================================================
interface CabinConfig {
    ai_active: boolean;
    property: {
        name: string;
        max_guests: number;
        base_price: number;
        cleaning_fee: number;
    };
    schedule: {
        check_in: string;
        check_out: string;
        minimum_stay: number;
    };
    integrations: {
        ical_export_url: string;
    };
    rules: string[];
    faq: { question: string; answer: string }[];
}

// ==============================================================
// DEFAULT STATE
// ==============================================================
const DEFAULT_CONFIG: CabinConfig = {
    ai_active: true,
    property: {
        name: 'Cabana Rosa',
        max_guests: 4,
        base_price: 450,
        cleaning_fee: 150,
    },
    schedule: {
        check_in: '14:00',
        check_out: '12:00',
        minimum_stay: 2,
    },
    integrations: {
        ical_export_url: '',
    },
    rules: [
        'Silêncio após as 22:00',
        'Não é permitido animais de estimação',
        'Lotação máxima de 4 pessoas',
        'Proibido fumar dentro da cabana',
    ],
    faq: [
        { question: 'Qual a distância da praia?', answer: '5 minutos a pé pela trilha.' },
        { question: 'Tem Wi-Fi?', answer: 'Sim, fibra óptica de 200Mbps.' },
    ],
};

// ==============================================================
// MAIN COMPONENT
// ==============================================================
export default function CabinDashboard() {
    const [config, setConfig] = useState<CabinConfig>(DEFAULT_CONFIG);
    const [newRule, setNewRule] = useState('');
    const [newFaqQ, setNewFaqQ] = useState('');
    const [newFaqA, setNewFaqA] = useState('');
    const [faqOpen, setFaqOpen] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // --- STATE UPDATERS WITH OBSERVABILITY ---

    const toggleAI = useCallback(() => {
        setConfig(prev => {
            const next = !prev.ai_active;
            console.log(`🤖 [STATE] AI Toggle switched. New value: ${next ? 'ACTIVE ✅' : 'INACTIVE ❌'}`);
            return { ...prev, ai_active: next };
        });
    }, []);

    const updateProperty = useCallback((field: keyof CabinConfig['property'], value: string | number) => {
        console.log('📝 [STATE] Updating property. Field:', field, 'Value:', value);
        setConfig(prev => ({
            ...prev,
            property: { ...prev.property, [field]: value },
        }));
    }, []);

    const updateSchedule = useCallback((field: keyof CabinConfig['schedule'], value: string | number) => {
        console.log('⏰ [STATE] Updating schedule. Field:', field, 'Value:', value);
        setConfig(prev => ({
            ...prev,
            schedule: { ...prev.schedule, [field]: value },
        }));
    }, []);

    const updateIcal = useCallback((value: string) => {
        console.log('🔗 [STATE] Updating iCal URL. Length:', value.length);
        setConfig(prev => ({
            ...prev,
            integrations: { ...prev.integrations, ical_export_url: value },
        }));
    }, []);

    const addRule = useCallback(() => {
        if (!newRule.trim()) return;
        console.log('📜 [STATE] Adding new rule:', newRule.trim());
        setConfig(prev => ({
            ...prev,
            rules: [...prev.rules, newRule.trim()],
        }));
        setNewRule('');
    }, [newRule]);

    const removeRule = useCallback((index: number) => {
        setConfig(prev => {
            console.log('🗑️ [STATE] Removing rule at index:', index, 'Content:', prev.rules[index]);
            return {
                ...prev,
                rules: prev.rules.filter((_, i) => i !== index),
            };
        });
    }, []);

    const addFaq = useCallback(() => {
        if (!newFaqQ.trim() || !newFaqA.trim()) return;
        console.log('❓ [STATE] Adding FAQ. Q:', newFaqQ.trim());
        setConfig(prev => ({
            ...prev,
            faq: [...prev.faq, { question: newFaqQ.trim(), answer: newFaqA.trim() }],
        }));
        setNewFaqQ('');
        setNewFaqA('');
    }, [newFaqQ, newFaqA]);

    const removeFaq = useCallback((index: number) => {
        setConfig(prev => {
            console.log('🗑️ [STATE] Removing FAQ at index:', index, 'Q:', prev.faq[index]?.question);
            return {
                ...prev,
                faq: prev.faq.filter((_, i) => i !== index),
            };
        });
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        console.log('💾 [SAVE] Saving cabin config to backend...', JSON.stringify(config, null, 2));
        // Simulate API call
        await new Promise(r => setTimeout(r, 1200));
        setSaving(false);
        setSaved(true);
        console.log('✅ [SAVE] Config persisted successfully.');
        setTimeout(() => setSaved(false), 2500);
    }, [config]);

    // --- RENDER ---

    return (
        <div className="min-h-screen bg-white text-gray-900 antialiased">
            {/* ======== HEADER ======== */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
                            <Palmtree className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-gray-900">
                                Dashboard da Cabana
                            </h1>
                            <p className="text-xs text-gray-400 -mt-0.5">
                                Painel de controle · Praia do Rosa
                            </p>
                        </div>
                    </div>

                    {/* AI TOGGLE */}
                    <button
                        onClick={toggleAI}
                        className="group flex items-center gap-2.5 cursor-pointer select-none"
                        id="ai-toggle"
                    >
                        <span className="text-xs font-semibold text-gray-400 group-hover:text-gray-600 transition-colors">
                            Eliza IA
                        </span>
                        <div className={`
                            relative w-12 h-7 rounded-full transition-colors duration-300 ease-in-out
                            ${config.ai_active ? 'bg-emerald-500' : 'bg-red-400'}
                        `}>
                            <motion.div
                                className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md"
                                animate={{ left: config.ai_active ? '22px' : '2px' }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                            <AnimatePresence mode="wait">
                                {config.ai_active ? (
                                    <motion.div
                                        key="active"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        className="absolute left-1.5 top-1/2 -translate-y-1/2"
                                    >
                                        <Sparkles className="w-3 h-3 text-white" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="inactive"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2"
                                    >
                                        <span className="text-[9px] font-bold text-white">OFF</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </button>
                </div>
            </header>

            {/* ======== MAIN CONTENT ======== */}
            <main className="max-w-4xl mx-auto px-6 py-8 space-y-8 pb-32">

                {/* --- PROPERTY NAME --- */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                >
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Nome da Propriedade
                    </label>
                    <div className="relative">
                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input
                            id="property-name"
                            type="text"
                            value={config.property.name}
                            onChange={e => updateProperty('name', e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                            placeholder="Nome da cabana..."
                        />
                    </div>
                </motion.section>

                {/* --- PRICING & CAPACITY CARD --- */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                        <DollarSign className="w-4 h-4 text-rose-500" />
                        <h2 className="text-sm font-bold text-gray-800">Preços & Capacidade</h2>
                    </div>

                    <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {/* Base Price */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Diária Base
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-300">
                                    R$
                                </span>
                                <input
                                    id="base-price"
                                    type="number"
                                    value={config.property.base_price}
                                    onChange={e => updateProperty('base_price', Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Cleaning Fee */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Taxa de Limpeza
                            </label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-300">
                                    R$
                                </span>
                                <input
                                    id="cleaning-fee"
                                    type="number"
                                    value={config.property.cleaning_fee}
                                    onChange={e => updateProperty('cleaning_fee', Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Max Guests */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Hóspedes Máx.
                            </label>
                            <div className="relative">
                                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    id="max-guests"
                                    type="number"
                                    value={config.property.max_guests}
                                    onChange={e => updateProperty('max_guests', Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Price Summary Strip */}
                    <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Exemplo: 3 diárias</span>
                        <span className="text-sm font-bold text-gray-900">
                            R$ {(config.property.base_price * 3 + config.property.cleaning_fee).toLocaleString('pt-BR')}
                            <span className="text-xs font-normal text-gray-400 ml-1">total</span>
                        </span>
                    </div>
                </motion.section>

                {/* --- OPERATIONS CARD --- */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-rose-500" />
                        <h2 className="text-sm font-bold text-gray-800">Operações</h2>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            {/* Check-in */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    Check-in
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        id="check-in-time"
                                        type="time"
                                        value={config.schedule.check_in}
                                        onChange={e => updateSchedule('check_in', e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Check-out */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    Check-out
                                </label>
                                <div className="relative">
                                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        id="check-out-time"
                                        type="time"
                                        value={config.schedule.check_out}
                                        onChange={e => updateSchedule('check_out', e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Minimum Stay */}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                    Estadia Mínima
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                    <input
                                        id="min-stay"
                                        type="number"
                                        min={1}
                                        value={config.schedule.minimum_stay}
                                        onChange={e => updateSchedule('minimum_stay', Number(e.target.value))}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                                    />
                                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-300">
                                        noites
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* iCal Sync */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5">
                                Link iCal (Airbnb / Booking)
                            </label>
                            <div className="relative">
                                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    id="ical-url"
                                    type="url"
                                    value={config.integrations.ical_export_url}
                                    onChange={e => updateIcal(e.target.value)}
                                    placeholder="https://www.airbnb.com/calendar/ical/..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* --- HOUSE RULES --- */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-rose-500" />
                            <h2 className="text-sm font-bold text-gray-800">Regras da Casa</h2>
                        </div>
                        <span className="text-xs font-medium text-gray-300">
                            {config.rules.length} regra{config.rules.length !== 1 && 's'}
                        </span>
                    </div>

                    <div className="p-6">
                        <LayoutGroup>
                            <motion.ul className="space-y-2 mb-4" layout>
                                <AnimatePresence mode="popLayout">
                                    {config.rules.map((rule, i) => (
                                        <motion.li
                                            key={rule + i}
                                            layout
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, overflow: 'hidden' }}
                                            transition={{ duration: 0.2 }}
                                            className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-gray-200 transition-colors"
                                        >
                                            <span className="text-sm text-gray-700">{rule}</span>
                                            <button
                                                onClick={() => removeRule(i)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                                                aria-label="Remover regra"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </motion.li>
                                    ))}
                                </AnimatePresence>
                            </motion.ul>
                        </LayoutGroup>

                        {/* Add Rule */}
                        <div className="flex gap-2">
                            <input
                                id="new-rule-input"
                                type="text"
                                value={newRule}
                                onChange={e => setNewRule(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addRule()}
                                placeholder="Nova regra..."
                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                            />
                            <button
                                onClick={addRule}
                                disabled={!newRule.trim()}
                                className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar
                            </button>
                        </div>
                    </div>
                </motion.section>

                {/* --- FAQ SECTION --- */}
                <motion.section
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <HelpCircle className="w-4 h-4 text-rose-500" />
                            <h2 className="text-sm font-bold text-gray-800">Perguntas Frequentes</h2>
                        </div>
                        <span className="text-xs font-medium text-gray-300">
                            {config.faq.length} ite{config.faq.length !== 1 ? 'ns' : 'm'}
                        </span>
                    </div>

                    <div className="p-6">
                        <LayoutGroup>
                            <motion.div className="space-y-2 mb-5" layout>
                                <AnimatePresence mode="popLayout">
                                    {config.faq.map((item, i) => (
                                        <motion.div
                                            key={item.question + i}
                                            layout
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                                            transition={{ duration: 0.2 }}
                                            className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors"
                                        >
                                            <button
                                                onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                                                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                                            >
                                                <span className="text-sm font-medium text-gray-800">
                                                    {item.question}
                                                </span>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            removeFaq(i);
                                                        }}
                                                        className="p-1 rounded-lg hover:bg-red-50 text-gray-200 hover:text-red-500 transition-all"
                                                        aria-label="Remover FAQ"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {faqOpen === i ? (
                                                        <ChevronUp className="w-4 h-4 text-gray-300" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4 text-gray-300" />
                                                    )}
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {faqOpen === i && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-4 pb-3 border-t border-gray-50">
                                                            <p className="text-sm text-gray-500 pt-3">
                                                                {item.answer}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </LayoutGroup>

                        {/* Add FAQ */}
                        <div className="space-y-2 p-4 bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                            <input
                                id="new-faq-question"
                                type="text"
                                value={newFaqQ}
                                onChange={e => setNewFaqQ(e.target.value)}
                                placeholder="Pergunta..."
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                            />
                            <input
                                id="new-faq-answer"
                                type="text"
                                value={newFaqA}
                                onChange={e => setNewFaqA(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addFaq()}
                                placeholder="Resposta..."
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all"
                            />
                            <button
                                onClick={addFaq}
                                disabled={!newFaqQ.trim() || !newFaqA.trim()}
                                className="w-full px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar FAQ
                            </button>
                        </div>
                    </div>
                </motion.section>
            </main>

            {/* ======== STICKY SAVE BUTTON ======== */}
            <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
                <div className="max-w-4xl mx-auto px-6 pb-6 flex justify-end pointer-events-auto">
                    <motion.button
                        id="save-config"
                        onClick={handleSave}
                        disabled={saving}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                            flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold
                            shadow-xl shadow-rose-500/20 transition-all duration-300
                            ${saved
                                ? 'bg-emerald-500 text-white'
                                : 'bg-rose-500 text-white hover:bg-rose-600'
                            }
                            ${saving ? 'opacity-70 cursor-not-allowed' : ''}
                        `}
                    >
                        {saving ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                >
                                    <Save className="w-4 h-4" />
                                </motion.div>
                                Salvando...
                            </>
                        ) : saved ? (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Salvo!
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Salvar Configurações
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
    );
}
