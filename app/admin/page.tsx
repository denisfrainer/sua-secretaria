'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Inter } from 'next/font/google';
import ElizaToggle from '../../components/ElizaToggle';

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'] });

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
}

type StatusKey = 'pending' | 'contacted' | 'talking' | 'closed';

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
        label: 'Pendentes',
        pillBg: 'bg-zinc-500/10',
        pillText: 'text-zinc-400',
        pillBorder: 'border-zinc-500/20',
    },
    {
        key: 'contacted',
        label: 'Iscas Enviadas',
        pillBg: 'bg-blue-500/10',
        pillText: 'text-blue-400',
        pillBorder: 'border-blue-500/20',
    },
    {
        key: 'talking',
        label: 'Em Conversacao',
        pillBg: 'bg-emerald-500/10',
        pillText: 'text-emerald-400',
        pillBorder: 'border-emerald-500/20',
    },
    {
        key: 'closed',
        label: 'Agendados',
        pillBg: 'bg-indigo-500/10',
        pillText: 'text-indigo-400',
        pillBorder: 'border-indigo-500/20',
    },
];

const ALL_STATUSES = [
    { value: 'pending', label: 'Pendente' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'talking', label: 'Talking' },
    { value: 'hot_lead', label: 'Hot Lead' },
    { value: 'closed', label: 'Closed' },
    { value: 'invalid_phone', label: 'Invalid' },
    { value: 'lixo', label: 'Descarte' },
];

// ==============================================================
// STATUS PILL COMPONENT
// ==============================================================
function StatusPill({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string }> = {
        pending:       { bg: 'bg-zinc-500/10',    text: 'text-zinc-400' },
        contacted:     { bg: 'bg-blue-500/10',     text: 'text-blue-400' },
        talking:       { bg: 'bg-emerald-500/10',  text: 'text-emerald-400' },
        closed:        { bg: 'bg-indigo-500/10',   text: 'text-indigo-400' },
        hot_lead:      { bg: 'bg-orange-500/10',   text: 'text-orange-400' },
        invalid_phone: { bg: 'bg-red-500/10',      text: 'text-red-400' },
        lixo:          { bg: 'bg-zinc-800/50',     text: 'text-zinc-600' },
    };
    const c = config[status] || config.pending;
    const label = ALL_STATUSES.find(s => s.value === status)?.label || status;

    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase rounded-full ${c.bg} ${c.text}`}>
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

    useEffect(() => {
        if (authorized) fetchLeads();
    }, [authorized, fetchLeads]);

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
            <div className={`min-h-screen bg-black flex items-center justify-center ${inter.className}`}>
                <div className="text-center space-y-5">
                    <Image src="/assets/wolf.png" width={48} height={48} alt="WolfAgent" className="mx-auto opacity-40" />
                    <h1 className="text-xl font-medium text-white/80 tracking-tight">Access Denied</h1>
                    <p className="text-sm text-white/30">Valid credentials required.</p>
                </div>
            </div>
        );
    }

    // LOADING
    if (loading) {
        return (
            <div className={`min-h-screen bg-black flex items-center justify-center ${inter.className}`}>
                <div className="text-center space-y-5">
                    <Image src="/assets/wolf.png" width={40} height={40} alt="WolfAgent" className="mx-auto animate-pulse opacity-30" />
                    <p className="text-sm text-white/30 tracking-widest uppercase">Loading...</p>
                </div>
            </div>
        );
    }

    // GROUP
    const grouped: Record<StatusKey, Lead[]> = { pending: [], contacted: [], talking: [], closed: [] };
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
        else if (lead.status === 'talking' || lead.status === 'organico_inbound' || lead.status === 'follow_up') grouped.talking.push(lead);
        else if (lead.status === 'closed' || lead.status === 'ganho' || lead.status === 'hot_lead') grouped.closed.push(lead);
    });

    const totalLeads = leads.length;
    const totalClosed = grouped.closed.length;
    const conversionRate = totalLeads > 0 ? Math.round((totalClosed / totalLeads) * 100) : 0;

    // RENDER
    return (
        <div className={`min-h-screen bg-black text-white ${inter.className}`}>
            {/* HEADER */}
            <header className="border-b border-white/[0.08] bg-black sticky top-0 z-50">
                <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Left: Logo + Title */}
                    <div className="flex items-center gap-4">
                        <Image src="/assets/wolf.png" width={32} height={32} alt="WolfAgent" className="opacity-80" />
                        <div className="flex items-center gap-3">
                            <h1 className="text-[15px] font-medium text-white/90 tracking-tight">
                                WolfAgent
                            </h1>
                            <span className="text-white/20">/</span>
                            <span className="text-[15px] text-white/50">Command Center</span>
                        </div>
                    </div>

                    {/* Center: Search */}
                    <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
                        <div className="relative w-full group">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search leads..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-10 pr-12 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all duration-200"
                            />
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-white/20 bg-white/[0.04] border border-white/[0.08] rounded">
                                    /
                                </kbd>
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats + Controls */}
                    <div className="flex items-center gap-5">
                        <div className="hidden lg:flex items-center gap-5 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-white/30">Total</span>
                                <span className="text-white/80 font-medium tabular-nums">{totalLeads}</span>
                            </div>
                            <div className="w-px h-4 bg-white/[0.08]" />
                            <div className="flex items-center gap-2">
                                <span className="text-white/30">Closed</span>
                                <span className="text-indigo-400 font-medium tabular-nums">{totalClosed}</span>
                            </div>
                            <div className="w-px h-4 bg-white/[0.08]" />
                            <div className="flex items-center gap-2">
                                <span className="text-white/30">Rate</span>
                                <span className="text-emerald-400 font-medium tabular-nums">{conversionRate}%</span>
                            </div>
                        </div>

                        <div className="w-px h-4 bg-white/[0.08]" />
                        <ElizaToggle adminKey={adminKey} />

                        <button
                            onClick={fetchLeads}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white/50 bg-white/[0.04] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] hover:text-white/80 hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            {/* KANBAN */}
            <main className="max-w-[1800px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 min-h-[calc(100vh-64px)]">
                    {COLUMNS.map((col, i) => (
                        <KanbanColumn
                            key={col.key}
                            config={col}
                            leads={grouped[col.key]}
                            onStatusChange={updateStatus}
                            updatingId={updatingId}
                            isLast={i === COLUMNS.length - 1}
                        />
                    ))}
                </div>
            </main>

            {/* DISCARDS */}
            {filteredLeads.filter((l) => l.status === 'lixo').length > 0 && (
                <div className="max-w-[1800px] mx-auto px-6 pb-12 border-t border-white/[0.08]">
                    <details className="group pt-6">
                        <summary className="cursor-pointer text-xs font-medium text-white/30 hover:text-white/50 transition-colors uppercase tracking-widest">
                            Discarded ({filteredLeads.filter((l) => l.status === 'lixo').length})
                        </summary>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredLeads
                                .filter((l) => l.status === 'lixo')
                                .map((lead) => (
                                    <LeadCard key={lead.id} lead={lead} onStatusChange={updateStatus} updatingId={updatingId} muted />
                                ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}

// ==============================================================
// KANBAN COLUMN
// ==============================================================
function KanbanColumn({
    config,
    leads,
    onStatusChange,
    updatingId,
    isLast,
}: {
    config: ColumnConfig;
    leads: Lead[];
    onStatusChange: (id: string, status: string) => void;
    updatingId: string | null;
    isLast: boolean;
}) {
    return (
        <div className={`flex flex-col ${!isLast ? 'border-r border-white/[0.08]' : ''}`}>
            {/* Column Header */}
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${config.pillBg} ring-2 ${config.pillBorder}`} />
                    <h2 className="text-[13px] font-medium text-white/60 tracking-tight">
                        {config.label}
                    </h2>
                </div>
                <span className="text-[12px] text-white/25 font-mono tabular-nums">
                    {leads.length}
                </span>
            </div>

            {/* Cards */}
            <div className="px-3 py-3 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-130px)]">
                {leads.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <p className="text-[13px] text-white/15">No leads</p>
                    </div>
                ) : (
                    leads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} onStatusChange={onStatusChange} updatingId={updatingId} />
                    ))
                )}
            </div>
        </div>
    );
}

// ==============================================================
// LEAD CARD
// ==============================================================
function LeadCard({
    lead,
    onStatusChange,
    updatingId,
    muted = false,
}: {
    lead: Lead;
    onStatusChange: (id: string, status: string) => void;
    updatingId: string | null;
    muted?: boolean;
}) {
    const isHot = lead.status === 'hot_lead';
    const isUpdating = updatingId === lead.id;
    const formattedDate = new Date(lead.created_at || new Date()).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

    return (
        <div
            className={`
                group rounded-lg p-4 border transition-all duration-200 cursor-default
                ${muted
                    ? 'bg-[#0B0E14]/50 border-white/[0.04] opacity-40'
                    : isHot
                    ? 'bg-[#0B0E14] border-white/[0.08] shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:border-white/[0.15]'
                    : 'bg-[#0B0E14] border-white/[0.06] hover:bg-[#12141D] hover:border-white/[0.15]'
                }
                ${isUpdating ? 'opacity-40 pointer-events-none' : ''}
            `}
        >
            {/* Top Row */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[14px] font-medium text-white/90 truncate leading-tight">
                        {lead.name || 'Unknown'}
                    </p>
                    <p className="text-[13px] text-white/25 font-mono tabular-nums">{lead.phone}</p>
                </div>
                <span className="text-[11px] text-white/20 whitespace-nowrap mt-0.5 font-mono">{formattedDate}</span>
            </div>

            {/* Details */}
            {(lead.niche || lead.main_pain) && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                    {lead.niche && (
                        <div className="flex items-baseline gap-2">
                            <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium shrink-0">Niche</span>
                            <span className="text-[13px] text-white/50 truncate">
                                {lead.niche}{lead.city ? ` · ${lead.city}` : ''}
                            </span>
                        </div>
                    )}
                    {lead.main_pain && (
                        <div className="flex items-baseline gap-2">
                            <span className="text-[11px] text-white/20 uppercase tracking-wider font-medium shrink-0">Pain</span>
                            <span className="text-[13px] text-white/50 line-clamp-2">{lead.main_pain}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Status Row */}
            <div className="mt-3 flex items-center justify-between gap-2">
                <StatusPill status={lead.status} />
                <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className="opacity-0 group-hover:opacity-100 text-[11px] bg-transparent border border-white/[0.08] rounded-md px-2 py-1 text-white/40 hover:text-white/60 hover:border-white/[0.15] focus:outline-none cursor-pointer appearance-none transition-all duration-200"
                    disabled={isUpdating}
                >
                    {ALL_STATUSES.map((s) => (
                        <option key={s.value} value={s.value} className="bg-[#0B0E14] text-white/80">
                            {s.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
