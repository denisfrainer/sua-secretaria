'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import {
    Mail,
    MessageCircle,
    DollarSign,
    TrendingUp,
    RefreshCw,
    ShieldAlert,
    Loader2,
    LogOut,
    Plus,
    Filter,
} from 'lucide-react';

// ==============================================================
// TYPES
// ==============================================================
interface Lead {
    id: string;
    name: string;
    phone: string;
    status: string;
    created_at: string;
}

import { motion, AnimatePresence } from 'framer-motion';

// ==============================================================
// iOS TOGGLE (ANIMATED)
// ==============================================================
function IosToggle({ enabled, onChange, loading }: { enabled: boolean; onChange: () => void; loading: boolean }) {
    return (
        <motion.button
            type="button"
            role="switch"
            aria-checked={enabled}
            initial={false}
            animate={{ 
                backgroundColor: enabled ? '#10b981' : '#f43f5e',
                opacity: loading ? 0.6 : 1
            }}
            onClick={() => !loading && onChange()}
            className={`relative w-[58px] h-[32px] rounded-full shrink-0 shadow-inner ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
        >
            <motion.span 
                layout
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`
                    absolute top-[2px] left-[2px] w-[28px] h-[28px] rounded-full bg-white shadow-md flex items-center justify-center
                    ${enabled ? 'translate-x-[26px]' : 'translate-x-0'}
                `} 
            >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            </motion.span>
        </motion.button>
    );
}

// ==============================================================
// METRIC CARD (LIGHT MODE STACKED)
// ==============================================================
function MetricCard({ label, value, Icon, iconColor }: { label: string; value: string | number; Icon: any; iconColor: string }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center justify-between transition-all hover:border-blue-100 group"
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Icon className={`w-7 h-7 ${iconColor}`} />
                </div>
                <div>
                    <p className="text-[16px] font-outfit text-slate-400 font-medium leading-none mb-1.5">{label}</p>
                    <p className="text-[26px] font-bold font-outfit tabular-nums text-slate-900 tracking-tight leading-none">{value}</p>
                </div>
            </div>
        </motion.div>
    );
}

// ==============================================================
// MAIN COMPONENT
// ==============================================================
export default function AdminDashboard() {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [adminKey, setAdminKey] = useState('');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    const [elizaActive, setElizaActive] = useState(true);
    const [elizaLoading, setElizaLoading] = useState(false);
    const [wolfActive, setWolfActive] = useState(true);
    const [wolfLoading, setWolfLoading] = useState(false);

    useEffect(() => {
        console.log('🚀 [MOUNT] AdminDashboard Final Minimalist Refactor');
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token') || '';
        setAdminKey(token);
        if (!token) { 
            setAuthorized(false); 
            setLoading(false); 
            return; 
        }
        setAuthorized(true);
    }, []);

    // FETCH AGENT STATUSES
    useEffect(() => {
        if (!adminKey) return;
        const fetchAgent = async (key: string, setter: (v: boolean) => void) => {
            try {
                const res = await fetch(`/api/admin/system-config?token=${encodeURIComponent(adminKey)}&key=${key}`);
                if (res.ok) {
                    const data = await res.json();
                    setter(data.enabled);
                }
            } catch { /* silent */ }
        };
        fetchAgent('eliza_active', setElizaActive);
        fetchAgent('wolf_prospect_active', setWolfActive);
    }, [adminKey]);

    // TOGGLE AGENT
    const toggleAgent = async (key: string, current: boolean, setter: (v: boolean) => void, loadSetter: (v: boolean) => void) => {
        const next = !current;
        loadSetter(true);
        try {
            const res = await fetch('/api/admin/system-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-wolf-token': adminKey },
                body: JSON.stringify({ key, enabled: next }),
            });
            if (res.ok) setter(next);
        } catch (err) { console.error('❌', err); }
        finally { loadSetter(false); }
    };

    // FETCH LEADS
    const fetchLeads = useCallback(async () => {
        if (!adminKey) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/leads?token=${encodeURIComponent(adminKey)}`);
            if (!res.ok) { setAuthorized(false); return; }
            const { leads: data } = await res.json();
            setLeads(data || []);
        } catch (err) { console.error('❌', err); }
        finally { setLoading(false); }
    }, [adminKey]);

    useEffect(() => {
        if (authorized) { fetchLeads(); }
    }, [authorized, fetchLeads]);

    const handleLogout = () => {
        window.location.href = '/admin/login';
    };

    // ---- LOADING ----
    if (loading) {
        return (
            <div className="h-screen bg-white flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-[18px] text-slate-400 font-outfit font-medium">Syncing Command Center...</p>
                </div>
            </div>
        );
    }

    // ---- UNAUTHORIZED ----
    if (authorized === false) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="w-full max-w-[420px] bg-white rounded-3xl p-10 shadow-sm border border-slate-200">
                    <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-6" />
                    <h1 className="text-[24px] font-bold text-slate-900 font-outfit mb-2 uppercase tracking-tighter">Security Alert</h1>
                    <p className="text-[16px] text-slate-500 font-outfit mb-8">Invalid encryption key. System access denied.</p>
                </div>
            </div>
        );
    }

    // CALCULATIONS
    const today = new Date().toISOString().split('T')[0];
    const contactedToday = leads.filter(l => l.status === 'contacted' && l.created_at.startsWith(today)).length;
    const talking = leads.filter(l => ['talking', 'followup'].includes(l.status)).length;
    const closed = leads.filter(l => ['closed', 'paid', 'ganho'].includes(l.status)).length;
    const total = leads.length;
    const conversionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-outfit flex flex-col items-center selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">

            {/* ======== HEADER ======== */}
            <header className="w-full max-w-[420px] px-6 pt-10 pb-4">
                {/* Top Row: Brand & Logout (Clean/Borderless) */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center transition-transform hover:scale-110 active:rotate-3">
                            <Image src="/assets/robot.png" width={32} height={32} alt="Wizard" className="w-8 h-8 object-contain" />
                        </div>
                        <h1 className="text-[24px] font-bold text-slate-900 font-outfit tracking-tight">Hello, wizard</h1>
                    </div>
                    {/* Logout Button: Rectangle removed, size/position preserved */}
                    <button
                        onClick={handleLogout}
                        className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors active:scale-90"
                    >
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>

                {/* Agent Toggles Row: Strictly RAW mode (48px) */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Eliza Toggle (Raw Icon) */}
                    <div className="p-4 flex items-center justify-start gap-4">
                        <div className="flex items-center w-[48px] h-[48px] justify-center">
                            <Image src="/assets/eliza.png" width={48} height={48} alt="Eliza" className="w-[48px] h-[48px] object-contain" />
                        </div>
                        <IosToggle enabled={elizaActive} loading={elizaLoading} onChange={() => toggleAgent('eliza_active', elizaActive, setElizaActive, setElizaLoading)} />
                    </div>

                    {/* Lobo Toggle (Raw Icon, No filter) */}
                    <div className="p-4 flex items-center justify-start gap-4">
                        <div className="flex items-center w-[48px] h-[48px] justify-center">
                            <Image src="/assets/wolf.png" width={48} height={48} alt="Lobo" className="w-[48px] h-[48px] object-contain" />
                        </div>
                        <IosToggle enabled={wolfActive} loading={wolfLoading} onChange={() => toggleAgent('wolf_prospect_active', wolfActive, setWolfActive, setWolfLoading)} />
                    </div>
                </div>
            </header>

            <main className="w-full max-w-[420px] px-6 py-4 flex flex-col gap-4 pb-24">
                {/* ======== STACKED METRIC CARDS (LIGHT MODE) ======== */}
                <MetricCard label="Contacted today" value={contactedToday} Icon={Mail} iconColor="text-blue-500" />
                <MetricCard label="Talking" value={talking} Icon={MessageCircle} iconColor="text-indigo-500" />
                <MetricCard label="Profits" value={closed} Icon={DollarSign} iconColor="text-emerald-500" />
                <MetricCard label="Conversion rate" value={`${conversionRate}%`} Icon={TrendingUp} iconColor="text-emerald-500" />
                
                {/* Footer Quote */}
                <footer className="mt-8 pb-6 flex justify-center">
                    <p className="text-[16px] text-slate-500 font-outfit lowercase tracking-tight opacity-70">
                        some people just like to build things
                    </p>
                </footer>
            </main>
        </div>
    );
}