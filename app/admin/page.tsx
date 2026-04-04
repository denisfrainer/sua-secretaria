'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Source_Sans_3 } from 'next/font/google';
import ElizaToggle from '../../components/ElizaToggle';

const sourceSans3 = Source_Sans_3({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700']
});

// ==============================================================
// TYPES
// ==============================================================
interface Lead {
    id: string;
    name: string;
    phone: string;
    niche?: string;
    city?: string;
    main_pain?: string;
    status: string;
    created_at: string;
    reply_count?: number;
    is_locked?: boolean;
}

type StatusKey = 'pending' | 'contacted' | 'talking' | 'closed' | 'paid';

interface ColumnConfig {
    key: StatusKey;
    label: string;
    pillBg: string;
    pillText: string;
    pillBorder: string;
}

// ==============================================================
// COLUMN DEFINITIONS
// ==============================================================
const COLUMNS: ColumnConfig[] = [
    {
        key: 'pending',
        label: 'Pending',
        pillBg: 'bg-zinc-500/10',
        pillText: 'text-zinc-400',
        pillBorder: 'border-zinc-500/20',
    },
    {
        key: 'contacted',
        label: 'Contacted',
        pillBg: 'bg-blue-500/10',
        pillText: 'text-blue-400',
        pillBorder: 'border-blue-500/20',
    },
    {
        key: 'talking',
        label: 'Engaged',
        pillBg: 'bg-emerald-500/10',
        pillText: 'text-emerald-400',
        pillBorder: 'border-emerald-500/20',
    },
    {
        key: 'paid',
        label: 'Paid',
        pillBg: 'bg-emerald-500/10',
        pillText: 'text-emerald-500',
        pillBorder: 'border-emerald-500/20',
    },
];

const ALL_STATUSES = [
    { value: 'pending', label: 'Pendente' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'talking', label: 'Talking' },
    { value: 'hot_lead', label: 'Hot Lead' },
    { value: 'closed', label: 'Closed' },
    { value: 'needs_human', label: 'Needs Human' },
    { value: 'invalid', label: 'Invalid' },
    { value: 'invalid_phone', label: 'Invalid Phone' },
    { value: 'lixo', label: 'Descarte' },
    { value: 'paid', label: 'Paid' },
];

// ==============================================================
// STATUS PILL COMPONENT
// ==============================================================
function StatusPill({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; border: string }> = {
        pending: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' },
        contacted: { bg: 'bg-[#00A3E1]/10', text: 'text-[#00A3E1]', border: 'border-[#00A3E1]/20' },
        talking: { bg: 'bg-[#00E676]/10', text: 'text-[#00E676]', border: 'border-[#00E676]/20' },
        closed: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
        hot_lead: { bg: 'bg-[#00E676]/10', text: 'text-[#00E676]', border: 'border-[#00E676]/20' },
        needs_human: { bg: 'bg-[#FF3B3F]/10', text: 'text-[#FF3B3F]', border: 'border-[#FF3B3F]/20' },
        invalid: { bg: 'bg-zinc-800/50', text: 'text-zinc-600', border: 'border-zinc-800/50' },
        invalid_phone: { bg: 'bg-[#FF3B3F]/10', text: 'text-[#FF3B3F]', border: 'border-[#FF3B3F]/20' },
        lixo: { bg: 'bg-zinc-800/50', text: 'text-zinc-600', border: 'border-zinc-800/50' },
        paid: { bg: 'bg-[#00A3E1]/10', text: 'text-[#00A3E1]', border: 'border-[#00A3E1]/20' },
    };

    const c = config[status] || config.pending;
    const label = ALL_STATUSES.find(s => s.value === status)?.label || status;

    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black tracking-[0.1em] uppercase rounded border ${c.bg} ${c.text} ${c.border}`}>
            {label}
        </span>
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
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [quarantineLeads, setQuarantineLeads] = useState<Lead[]>([]);
    const [resettingId, setResettingId] = useState<string | null>(null);
    const [masterResetting, setMasterResetting] = useState(false);

    // AUTH
    useEffect(() => {
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

    // FETCH
    const fetchLeads = useCallback(async () => {
        if (!adminKey) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/leads?token=${encodeURIComponent(adminKey)}`);
            if (!res.ok) { setAuthorized(false); return; }
            const { leads: data } = await res.json();
            setLeads(data || []);
        } catch (err) {
            console.error('Network error:', err);
        } finally {
            setLoading(false);
        }
    }, [adminKey]);

    // QUARANTINE FETCH
    const fetchQuarantine = useCallback(async () => {
        if (!adminKey) return;
        try {
            const res = await fetch(`/api/admin/quarantine?token=${encodeURIComponent(adminKey)}`);
            if (res.ok) {
                const { leads: data } = await res.json();
                setQuarantineLeads(data || []);
            }
        } catch (err) {
            console.error('Quarantine fetch error:', err);
        }
    }, [adminKey]);

    useEffect(() => {
        if (authorized) {
            fetchLeads();
            fetchQuarantine();
        }
    }, [authorized, fetchLeads, fetchQuarantine]);

    // SINGLE RESET
    const resetLead = async (leadId: string) => {
        setResettingId(leadId);
        try {
            const res = await fetch('/api/admin/quarantine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-wolf-token': adminKey },
                body: JSON.stringify({ action: 'reset_single', leadId }),
            });
            if (res.ok) {
                setQuarantineLeads(prev => prev.filter(l => l.id !== leadId));
                fetchLeads();
            }
        } catch (err) {
            console.error('Reset error:', err);
        } finally {
            setResettingId(null);
        }
    };

    // MASTER RESET
    const masterReset = async () => {
        if (!confirm('MASTER RESET: Desbloquear TODOS os leads travados? Esta ação não pode ser desfeita.')) return;
        setMasterResetting(true);
        try {
            const res = await fetch('/api/admin/quarantine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-wolf-token': adminKey },
                body: JSON.stringify({ action: 'master_reset' }),
            });
            if (res.ok) {
                setQuarantineLeads([]);
                fetchLeads();
            }
        } catch (err) {
            console.error('Master reset error:', err);
        } finally {
            setMasterResetting(false);
        }
    };

    // STATUS UPDATE
    const updateStatus = async (leadId: string, newStatus: string) => {
        setUpdatingId(leadId);
        try {
            const res = await fetch('/api/admin/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-wolf-token': adminKey },
                body: JSON.stringify({ leadId, newStatus }),
            });
            if (res.ok) {
                setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
            }
        } catch (err) {
            console.error('Update error:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    // UNAUTHORIZED
    if (authorized === false) {
        return (
            <div className={`h-screen bg-black flex items-center justify-center ${sourceSans3.className}`}>
                <div className="text-center space-y-5">
                    <Image src="/assets/robot.png" width={48} height={48} alt="meatende.ai" className="mx-auto opacity-40" />
                    <h1 className="text-xl font-medium text-white/80 tracking-tight">Access Denied</h1>
                    <p className="text-sm text-white/30">Valid credentials required.</p>
                </div>
            </div>
        );
    }

    // LOADING
    if (loading) {
        return (
            <div className={`h-screen bg-black flex items-center justify-center ${sourceSans3.className}`}>
                <div className="text-center space-y-5">
                    <Image src="/assets/robot.png" width={40} height={40} alt="meatende.ai" className="mx-auto animate-pulse opacity-30" />
                    <p className="text-sm text-white/30 tracking-widest uppercase">Loading...</p>
                </div>
            </div>
        );
    }

    // GROUP
    const grouped: Record<StatusKey, Lead[]> = { pending: [], contacted: [], talking: [], closed: [], paid: [] };
    const filteredLeads = searchQuery
        ? leads.filter(l =>
            l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.phone?.includes(searchQuery) ||
            l.niche?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : leads;

    filteredLeads.forEach((lead) => {
        if (lead.status === 'pending') grouped.pending.push(lead);
        else if (lead.status === 'contacted') grouped.contacted.push(lead);
        else if (lead.status === 'talking' || lead.status === 'organic_inbound' || lead.status === 'follow_up' || lead.status === 'hot_lead') grouped.talking.push(lead);
        else if (lead.status === 'closed' || lead.status === 'ganho' || lead.status === 'paid') grouped.paid.push(lead);
    });

    const totalLeads = leads.length;
    const totalClosed = (grouped.closed.length + grouped.paid.length);
    const conversionRate = totalLeads > 0 ? Math.round((totalClosed / totalLeads) * 100) : 0;

    // RENDER
    return (
        <div className={`flex h-screen bg-[#0A0A0A] text-white overflow-hidden ${sourceSans3.className}`}>

            {/* LEFT SIDEBAR */}
            <aside className="w-[70px] border-r border-white/[0.05] flex flex-col items-center py-8 gap-10 shrink-0 bg-[#0A0A0A]">
                <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                    <Image src="/assets/robot.png" width={24} height={24} alt="L" />
                </div>

                <nav className="flex flex-col gap-6">
                    <SidebarIcon active>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </SidebarIcon>
                    <SidebarIcon>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </SidebarIcon>
                    <SidebarIcon>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </SidebarIcon>
                    <SidebarIcon>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </SidebarIcon>
                    <SidebarIcon>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </SidebarIcon>
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col relative overflow-hidden">

                {/* GLOBAL HEADER */}
                <header className="h-16 border-b border-white/[0.05] bg-[#0A0A0A]/80 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <h1 className="text-[14px] font-bold text-white tracking-widest uppercase">meatende.ai</h1>
                            <span className="text-white/10">/</span>
                            <span className="text-[13px] text-white/40 font-medium">Command Center</span>
                        </div>

                        <div className="relative w-[300px]">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search leads..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.02] border border-white/[0.05] rounded-full pl-9 pr-4 py-1.5 text-[12px] text-white/60 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
                            <div className="flex flex-col items-end">
                                <span className="text-white/20">Total Leads</span>
                                <span className="text-white/80 tabular-nums text-[13px]">{totalLeads}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-white/20">Closed</span>
                                <span className="text-indigo-400 tabular-nums text-[13px]">{totalClosed}</span>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-white/20">Rate</span>
                                <span className="text-emerald-400 tabular-nums text-[13px]">{conversionRate}%</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <ElizaToggle adminKey={adminKey} />
                            <button onClick={fetchLeads} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05] text-white/40 hover:text-white hover:bg-white/[0.08] transition-all">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </header>

                {/* SCROLLABLE BODY */}
                <div className="flex-1 overflow-y-auto bg-[#020202] scrollbar-hide">
                    <div className="max-w-[1800px] mx-auto p-8 space-y-10 pb-[300px]">

                        {/* 1. METRICS BAR */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <MetricCard
                                label="PENDING"
                                value={grouped.pending.length}
                                sublabel="(TOTAL)"
                                icon="user"
                                color="blue"
                            />
                            <MetricCard
                                label="CONTACTED"
                                value={grouped.contacted.length}
                                sublabel="(TODAY)"
                                icon="mail"
                                color="green"
                                trend="+8%"
                            />
                            <MetricCard
                                label="ENGAGED"
                                value={grouped.talking.length}
                                sublabel="(TODAY)"
                                icon="briefcase"
                                color="green"
                                trend="+2%"
                            />
                            <MetricCard
                                label="PAID"
                                value={grouped.paid.length}
                                sublabel="(TODAY)"
                                icon="camera"
                                color="blue"
                                trend="+2%"
                            />
                        </div>

                        {/* 2. KANBAN BOARD */}
                        <div className="flex flex-nowrap gap-5 min-h-[500px] overflow-x-auto pb-4">
                            {COLUMNS.map((col) => (
                                <KanbanColumn
                                    key={col.key}
                                    config={col}
                                    leads={grouped[col.key]}
                                    onStatusChange={updateStatus}
                                    updatingId={updatingId}
                                    accentColor={
                                        col.key === 'pending' ? 'blue' :
                                            col.key === 'contacted' ? 'emerald' :
                                                col.key === 'talking' ? 'emerald' : 'indigo'
                                    }
                                />
                            ))}
                        </div>

                        {/* 3. RECENT ACTIVITY TABLE */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[13px] font-bold text-white tracking-[0.2em] uppercase opacity-40">Recent Activity (Total)</h2>
                                <button onClick={fetchLeads} className="text-[10px] font-bold text-white/20 hover:text-emerald-400 transition-colors uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    Live Updates
                                </button>
                            </div>

                            <div className="bg-[#0D0D0D] border border-white/[0.05] rounded-2xl overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                                            <th className="px-6 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Lead Name</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Niche</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Phone</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-bold text-white/20 uppercase tracking-widest text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        {leads.slice(0, 10).map((lead) => (
                                            <tr key={lead.id} className="group hover:bg-white/[0.01] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                                                            <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                            </svg>
                                                        </div>
                                                        <span className="text-[13px] font-bold text-white/80 group-hover:text-white">{lead.name || 'Anonymous'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-[12px] text-white/30 italic">{lead.niche || '—'}</td>
                                                <td className="px-6 py-4 text-[12px] text-white/40 font-mono tracking-tighter">{lead.phone}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <StatusPill status={lead.status} />
                                                </td>
                                                <td className="px-6 py-4 text-[11px] text-white/20 font-mono text-right">
                                                    {new Date(lead.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>

                {/* QUARANTINE ZONE (PORTAL) */}
                {quarantineLeads.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-red-950/20 backdrop-blur-2xl border-t border-red-500/40 shadow-[0_-15px_40px_rgba(239,68,68,0.15)] z-50 shrink-0">
                        <div className="max-w-[1800px] mx-auto px-8 py-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]" />
                                    <h2 className="text-[12px] font-black text-red-500 uppercase tracking-[0.3em]">
                                        QUARANTINE ZONE
                                    </h2>
                                    <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/10 border border-red-500/20 text-red-400">
                                        {quarantineLeads.length} SYSTEM LOCKS
                                    </span>
                                </div>
                                <button
                                    onClick={masterReset}
                                    disabled={masterResetting}
                                    className="px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                                >
                                    {masterResetting ? 'Processing...' : 'MASTER RESET ALL'}
                                </button>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                {quarantineLeads.map((lead) => (
                                    <div key={lead.id} className="flex-none w-[300px] bg-black/40 border border-red-500/20 rounded-2xl p-4 hover:border-red-500/50 transition-all group relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-black text-white truncate uppercase tracking-tight group-hover:text-red-400">{lead.name || 'CRITICAL'}</p>
                                                <p className="text-[11px] text-red-400/40 font-mono tracking-tighter">{lead.phone}</p>
                                            </div>
                                            <StatusPill status={lead.status} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="px-2 py-1 text-[9px] font-black bg-red-500/10 text-red-500 border border-red-500/20 rounded uppercase tracking-tighter">NEEDS HUMAN</span>
                                            <button
                                                onClick={() => resetLead(lead.id)}
                                                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-lg hover:bg-emerald-500/10 transition-all"
                                            >
                                                Unlocked
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


// ==============================================================
// SUB-COMPONENTS
// ==============================================================

function SidebarIcon({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
    return (
        <button className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-[#00E676]/10 text-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.1)] border border-[#00E676]/20' : 'text-white/20 hover:text-white/50 hover:bg-white/[0.03]'}`}>
            {children}
        </button>
    );
}

function MetricCard({ label, value, sublabel, icon, color, trend }: { label: string; value: number; sublabel: string; icon: string; color: 'blue' | 'green'; trend?: string }) {
    const iconColors = {
        blue: 'bg-[#00A3E1]/10 text-[#00A3E1] border-[#00A3E1]/20',
        green: 'bg-[#00E676]/10 text-[#00E676] border-[#00E676]/20'
    };

    return (
        <div className="bg-[#161616] border border-white/[0.05] rounded-[24px] p-6 hover:border-white/10 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start">
                <div className={`p-3 rounded-2xl border ${iconColors[color]}`}>
                    {icon === 'user' && (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    )}
                    {icon === 'mail' && (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    )}
                    {icon === 'briefcase' && (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    )}
                    {icon === 'camera' && (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    )}
                </div>
                {trend && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#00E676] text-[10px] font-black tracking-tighter">
                        {trend}
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-baseline gap-2">
                <span className="text-[36px] font-black text-white tabular-nums leading-none tracking-tight">{value}</span>
                <div className="flex flex-col">
                    <span className="text-[11px] font-black text-white/60 tracking-[0.2em] leading-tight">{label}</span>
                    <span className="text-[9px] font-bold text-white/20 tracking-widest">{sublabel}</span>
                </div>
            </div>
        </div>
    );
}

function KanbanColumn({
    config,
    leads,
    onStatusChange,
    updatingId,
    accentColor,
}: {
    config: ColumnConfig;
    leads: Lead[];
    onStatusChange: (id: string, status: string) => void;
    updatingId: string | null;
    accentColor: string;
}) {
    const dotVariants: Record<string, string> = {
        zinc: 'bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.4)]',
        blue: 'bg-[#00A3E1] shadow-[0_0_12px_rgba(0,163,225,0.6)]',
        emerald: 'bg-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.6)]',
        indigo: 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]',
    };

    return (
        <div className="flex flex-col min-w-[320px] max-w-[320px] group/col">
            <div className="px-5 py-5 flex items-center justify-between border-b border-white/[0.05] bg-[#161616]/40 rounded-t-[20px] backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full ${dotVariants[accentColor] || dotVariants.zinc}`} />
                    <h2 className="text-[12px] font-black text-white group-hover/col:text-[#00A3E1] transition-colors uppercase tracking-[0.2em]">
                        {config.label}
                    </h2>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-black text-white/40 bg-white/[0.05] rounded-lg border border-white/[0.05] group-hover/col:border-white/20 group-hover/col:text-white transition-all">
                    {leads.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto px-1.5 py-4 space-y-4 min-h-0 bg-white/[0.01] border-x border-white/[0.03]">
                {leads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 border border-dashed border-white/[0.05] rounded-3xl m-2 opacity-20">
                        <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-[10px] font-black uppercase tracking-widest">No Records</p>
                    </div>
                ) : (
                    leads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} onStatusChange={onStatusChange} updatingId={updatingId} accentColor={accentColor} />
                    ))
                )}
            </div>
            <div className="h-3 bg-[#161616]/40 rounded-b-[20px] border-t border-white/[0.03]" />
        </div>
    );
}

function LeadCard({
    lead,
    onStatusChange,
    updatingId,
    muted = false,
    accentColor,
}: {
    lead: Lead;
    onStatusChange: (id: string, status: string) => void;
    updatingId: string | null;
    muted?: boolean;
    accentColor?: string;
}) {
    const isHot = lead.status === 'hot_lead' || lead.status === 'paid';
    const isUpdating = updatingId === lead.id;
    const formattedDate = new Date(lead.created_at || new Date()).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

    const glowVariants: Record<string, string> = {
        zinc: 'hover:border-zinc-500/40 hover:shadow-[0_0_20px_rgba(113,113,122,0.08)]',
        blue: 'hover:border-[#00A3E1]/50 hover:shadow-[0_0_25px_rgba(0,163,225,0.12)]',
        emerald: 'hover:border-[#00E676]/50 hover:shadow-[0_0_25px_rgba(0,230,118,0.12)]',
        indigo: 'hover:border-indigo-500/50 hover:shadow-[0_0_25px_rgba(99,102,241,0.12)]',
    };

    return (
        <div className={`
            group relative rounded-[20px] p-5 border transition-all duration-300 cursor-default bg-[#161616]
            ${muted ? 'opacity-40 border-white/[0.05]' : `border-white/[0.08] ${accentColor ? glowVariants[accentColor] : ''}`}
            ${isUpdating ? 'opacity-40 scale-95 pointer-events-none' : 'hover:-translate-y-1'}
        `}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-black text-white group-hover:text-[#00A3E1] transition-colors truncate uppercase tracking-tight">
                        {lead.name || 'Anonymous Lead'}
                    </p>
                    <p className="text-[11px] text-white/30 font-mono tracking-tighter tabular-nums">{lead.phone}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1m-6 9a3 3 0 100-6 3 3 0 000 6zm-7 0a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
            </div>

            <div className="space-y-2 mb-5">
                {lead.niche && (
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.02] border border-white/[0.03]">
                        <div className="w-1 h-1 rounded-full bg-[#00E676] shadow-[0_0_5px_#00E676]" />
                        <span className="text-[11px] text-white/50 truncate font-bold uppercase tracking-tighter">
                            {lead.niche}{lead.city ? ` · ${lead.city}` : ''}
                        </span>
                    </div>
                )}
                <div className="text-[11px] text-white/30 truncate uppercase tracking-widest font-black opacity-40">
                    ORGANIC_INBOUND
                </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/[0.05]">
                <StatusPill status={lead.status} />
                <span className="text-[10px] font-black text-white/10 uppercase tracking-widest">{formattedDate}</span>
            </div>
        </div>
    );
}
