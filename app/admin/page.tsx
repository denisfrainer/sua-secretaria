'use client';

import { useEffect, useState, useCallback } from 'react';
import ElizaToggle from '../../components/ElizaToggle';

// ==============================================================
// 🔧 TYPES
// ==============================================================
interface Lead {
    id: string;
    nome: string;
    telefone: string;
    empresa?: string;
    dor_principal?: string;
    status: string;
    criado_em: string;
}

type StatusKey = 'pendente' | 'isca_enviada' | 'em_conversacao' | 'agendado';

interface ColumnConfig {
    key: StatusKey;
    label: string;
    emoji: string;
    accentColor: string;
    glowColor: string;
}

// ==============================================================
// 🎨 COLUMN DEFINITIONS
// ==============================================================
const COLUMNS: ColumnConfig[] = [
    {
        key: 'pendente',
        label: 'Pendentes',
        emoji: '⏳',
        accentColor: 'text-amber-400',
        glowColor: 'shadow-amber-500/10',
    },
    {
        key: 'isca_enviada',
        label: 'Iscas Enviadas',
        emoji: '🎣',
        accentColor: 'text-sky-400',
        glowColor: 'shadow-sky-500/10',
    },
    {
        key: 'em_conversacao',
        label: 'Em Conversação',
        emoji: '💬',
        accentColor: 'text-emerald-400',
        glowColor: 'shadow-emerald-500/10',
    },
    {
        key: 'agendado',
        label: 'Agendados / Ganhos',
        emoji: '🏆',
        accentColor: 'text-[#00FF41]',
        glowColor: 'shadow-[#00FF41]/10',
    },
];

const ALL_STATUSES = [
    { value: 'pendente', label: '⏳ Pendente' },
    { value: 'isca_enviada', label: '🎣 Isca Enviada' },
    { value: 'em_conversacao', label: '💬 Em Conversação' },
    { value: 'hot_lead', label: '🔥 Hot Lead' },
    { value: 'agendado', label: '📅 Agendado' },
    { value: 'ganho', label: '🏆 Ganho' },
    { value: 'organico_inbound', label: '🌱 Orgânico Inbound' },
    { value: 'lixo', label: '🗑️ Lixo' },
];

// ==============================================================
// 🧩 COMPONENT
// ==============================================================
export default function AdminDashboard() {
    const [authorized, setAuthorized] = useState<boolean | null>(null);
    const [adminKey, setAdminKey] = useState('');
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // ----------------------------------------------------------
    // 🔐 AUTH CHECK
    // ----------------------------------------------------------
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const key = params.get('key') || '';
        setAdminKey(key);

        if (!key) {
            setAuthorized(false);
            setLoading(false);
            return;
        }

        setAuthorized(true);
    }, []);

    // ----------------------------------------------------------
    // 📡 DATA FETCHING (via secure server API)
    // ----------------------------------------------------------
    const fetchLeads = useCallback(async () => {
        if (!adminKey) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/leads?key=${encodeURIComponent(adminKey)}`);
            if (!res.ok) {
                console.error('Falha ao buscar leads');
                setAuthorized(false);
                return;
            }
            const { leads: data } = await res.json();
            setLeads(data || []);
        } catch (err) {
            console.error('Erro de rede:', err);
        } finally {
            setLoading(false);
        }
    }, [adminKey]);

    useEffect(() => {
        if (authorized) fetchLeads();
    }, [authorized, fetchLeads]);

    // ----------------------------------------------------------
    // 🔄 STATUS UPDATE
    // ----------------------------------------------------------
    const updateStatus = async (leadId: string, newStatus: string) => {
        setUpdatingId(leadId);
        try {
            const res = await fetch('/api/admin/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': adminKey,
                },
                body: JSON.stringify({ leadId, newStatus }),
            });

            if (res.ok) {
                // Optimistic update
                setLeads((prev) =>
                    prev.map((l) =>
                        l.id === leadId ? { ...l, status: newStatus } : l
                    )
                );
            } else {
                console.error('Falha ao atualizar status');
            }
        } catch (err) {
            console.error('Erro ao atualizar:', err);
        } finally {
            setUpdatingId(null);
        }
    };

    // ----------------------------------------------------------
    // 🛑 UNAUTHORIZED SCREEN
    // ----------------------------------------------------------
    if (authorized === false) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="text-6xl">🐺</div>
                    <h1 className="text-2xl font-bold text-red-500 font-[family-name:var(--font-space-grotesk)]">
                        Acesso Negado
                    </h1>
                    <p className="text-zinc-500 text-sm">
                        Você precisa de credenciais válidas para acessar o Command Center.
                    </p>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------------
    // ⏳ LOADING
    // ----------------------------------------------------------
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center space-y-3">
                    <div className="text-4xl animate-pulse">🐺</div>
                    <p className="text-zinc-500 text-sm tracking-widest uppercase">
                        Carregando dados...
                    </p>
                </div>
            </div>
        );
    }

    // ----------------------------------------------------------
    // 📊 GROUP LEADS BY STATUS
    // ----------------------------------------------------------
    const grouped: Record<StatusKey, Lead[]> = {
        pendente: [],
        isca_enviada: [],
        em_conversacao: [],
        agendado: [],
    };

    leads.forEach((lead) => {
        if (lead.status === 'pendente') grouped.pendente.push(lead);
        else if (lead.status === 'isca_enviada') grouped.isca_enviada.push(lead);
        else if (lead.status === 'em_conversacao' || lead.status === 'organico_inbound') grouped.em_conversacao.push(lead);
        else if (lead.status === 'agendado' || lead.status === 'ganho' || lead.status === 'hot_lead') grouped.agendado.push(lead);
    });

    const totalLeads = leads.length;
    const totalAgendados = grouped.agendado.length;

    // ----------------------------------------------------------
    // 🖥️ RENDER
    // ----------------------------------------------------------
    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* ==================== HEADER ==================== */}
            <header className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">🐺</span>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight font-[family-name:var(--font-space-grotesk)]">
                                WolfAgent Command Center
                            </h1>
                            <p className="text-xs text-zinc-500 tracking-wider uppercase mt-0.5">
                                Painel de Controle Operacional
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Stats */}
                        <div className="hidden md:flex items-center gap-6 text-sm">
                            <div className="text-center">
                                <p className="text-zinc-500 text-xs uppercase tracking-wider">Total</p>
                                <p className="text-lg font-bold text-white">{totalLeads}</p>
                            </div>
                            <div className="w-px h-8 bg-zinc-800" />
                            <div className="text-center">
                                <p className="text-zinc-500 text-xs uppercase tracking-wider">Ganhos</p>
                                <p className="text-lg font-bold text-[#00FF41]">{totalAgendados}</p>
                            </div>
                            <div className="w-px h-8 bg-zinc-800" />
                            <div className="text-center">
                                <p className="text-zinc-500 text-xs uppercase tracking-wider">Taxa</p>
                                <p className="text-lg font-bold text-emerald-400">
                                    {totalLeads > 0
                                        ? `${Math.round((totalAgendados / totalLeads) * 100)}%`
                                        : '—'}
                                </p>
                            </div>
                        </div>

                        {/* Eliza Kill Switch */}
                        <ElizaToggle adminKey={adminKey} />

                        {/* Refresh */}
                        <button
                            onClick={fetchLeads}
                            className="px-4 py-2 text-xs uppercase tracking-wider border border-zinc-700 rounded-lg hover:bg-zinc-800 hover:border-zinc-600 transition-all duration-200 cursor-pointer"
                        >
                            ↻ Atualizar
                        </button>
                    </div>
                </div>
            </header>

            {/* ==================== KANBAN BOARD ==================== */}
            <main className="max-w-[1600px] mx-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                    {COLUMNS.map((col) => (
                        <KanbanColumn
                            key={col.key}
                            config={col}
                            leads={grouped[col.key]}
                            onStatusChange={updateStatus}
                            updatingId={updatingId}
                        />
                    ))}
                </div>
            </main>

            {/* ==================== LEADS WITHOUT KANBAN (lixo, etc) ==================== */}
            {leads.filter((l) => l.status === 'lixo').length > 0 && (
                <div className="max-w-[1600px] mx-auto px-6 pb-10">
                    <details className="group">
                        <summary className="cursor-pointer text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
                            🗑️ Leads descartados ({leads.filter((l) => l.status === 'lixo').length})
                        </summary>
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                            {leads
                                .filter((l) => l.status === 'lixo')
                                .map((lead) => (
                                    <LeadCard
                                        key={lead.id}
                                        lead={lead}
                                        onStatusChange={updateStatus}
                                        updatingId={updatingId}
                                        muted
                                    />
                                ))}
                        </div>
                    </details>
                </div>
            )}
        </div>
    );
}

// ==============================================================
// 🏗️ KANBAN COLUMN
// ==============================================================
function KanbanColumn({
    config,
    leads,
    onStatusChange,
    updatingId,
}: {
    config: ColumnConfig;
    leads: Lead[];
    onStatusChange: (id: string, status: string) => void;
    updatingId: string | null;
}) {
    return (
        <div
            className={`bg-zinc-900/60 rounded-xl border border-zinc-800/50 flex flex-col shadow-lg ${config.glowColor}`}
        >
            {/* Column Header */}
            <div className="px-4 py-3.5 border-b border-zinc-800/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <span className="text-lg">{config.emoji}</span>
                    <h2 className={`text-sm font-bold tracking-wide uppercase ${config.accentColor}`}>
                        {config.label}
                    </h2>
                </div>
                <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">
                    {leads.length}
                </span>
            </div>

            {/* Cards Container */}
            <div className="p-3 space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-220px)] custom-scrollbar">
                {leads.length === 0 ? (
                    <div className="text-center py-10 text-zinc-700 text-xs italic">
                        Nenhum lead aqui
                    </div>
                ) : (
                    leads.map((lead) => (
                        <LeadCard
                            key={lead.id}
                            lead={lead}
                            onStatusChange={onStatusChange}
                            updatingId={updatingId}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

// ==============================================================
// 🃏 LEAD CARD
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
    const formattedDate = new Date(lead.criado_em).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
    });

    return (
        <div
            className={`rounded-lg p-4 border transition-all duration-200 group ${
                muted
                    ? 'bg-zinc-900/40 border-zinc-800/30 opacity-50'
                    : isHot
                    ? 'bg-rose-500/10 border-rose-500/50 hover:bg-rose-500/20 hover:border-rose-400'
                    : 'bg-zinc-800/70 border-zinc-700/50 hover:border-zinc-600/70 hover:bg-zinc-800'
            } ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
        >
            {/* Top Row */}
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                        {lead.nome || 'Sem nome'}
                        {isHot && <span className="text-base animate-pulse" title="Lead pronto para fechamento!">🔥</span>}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{lead.telefone}</p>
                </div>
                <span className="text-[10px] text-zinc-600 whitespace-nowrap mt-0.5">
                    {formattedDate}
                </span>
            </div>

            {/* Details */}
            {(lead.empresa || lead.dor_principal) && (
                <div className="mt-2.5 pt-2.5 border-t border-zinc-700/30 space-y-1">
                    {lead.empresa && (
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                            <span className="text-zinc-600">🏢</span> {lead.empresa}
                        </p>
                    )}
                    {lead.dor_principal && (
                        <p className="text-xs text-zinc-500 flex items-start gap-1.5">
                            <span className="text-zinc-600 shrink-0">🎯</span>
                            <span className="line-clamp-2">{lead.dor_principal}</span>
                        </p>
                    )}
                </div>
            )}

            {/* Status Dropdown */}
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <select
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-700/50 rounded-md px-2.5 py-1.5 text-zinc-400 hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#00FF41]/30 cursor-pointer appearance-none"
                    disabled={isUpdating}
                >
                    {ALL_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
