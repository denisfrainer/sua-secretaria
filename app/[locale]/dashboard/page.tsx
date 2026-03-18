import React from 'react';
import { Bot, Activity, Users, Settings, Plus, QrCode } from 'lucide-react';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { AgentSettings } from '../../../components/AgentSettings';

export const dynamic = 'force-dynamic';

export default async function AgentDashboard() {
    const { data: agents } = await supabaseAdmin
        .from('agent_configs')
        .select('*, organizations(name)');

    const agentesReais = agents || [];
    const agentesAtivos = agentesReais.filter(a => a.is_active).length;
    // Assuming 499 per agent
    const mrrCalculado = agentesAtivos * 499;

    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col p-4 max-w-lg mx-auto sm:max-w-xl md:max-w-2xl border-x border-white">
            
            {/* 1. HEADER */}
            <header className="flex justify-between items-center py-4 border-b border-white">
                <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-xl tracking-tighter">LP.NEXUS</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-[10px] font-semibold tracking-widest text-[#00E676]">
                        <span className="w-1.5 h-1.5 bg-[#00E676] inline-block" /> AGENTS: ACTIVE
                    </span>
                    <Settings size={18} className="text-white cursor-pointer" />
                </div>
            </header>

            {/* 2. MAIN KPI SECTION */}
            <section className="py-12 flex flex-col items-center justify-center border-b border-white">
                <h1 className="text-4xl font-heading font-bold tracking-tight">R$ {mrrCalculado}</h1>
                <p className="text-xs text-[#888888] mt-1 uppercase tracking-wider">vs R$ 0,00 last month</p>
                <p className="text-sm text-white mt-1">MRR TOTAL</p>
            </section>

            {/* 3. AGENT STATUS GRID (2x2) */}
            <section className="grid grid-cols-2 border-b border-white">
                <div className="border-r border-b border-white p-5 space-y-2 flex flex-col">
                    <Activity size={20} className="text-white" />
                    <div>
                        <p className="text-xs text-[#888888] uppercase font-semibold">Conversas</p>
                        <p className="text-2xl font-bold">0</p>
                    </div>
                </div>
                <div className="border-b border-white p-5 space-y-2 flex flex-col">
                    <Bot size={20} className="text-white" />
                    <div>
                        <p className="text-xs text-[#888888] uppercase font-semibold">Agentes Ativos</p>
                        <p className="text-2xl font-bold">{agentesAtivos}</p>
                    </div>
                </div>
                <div className="border-r p-5 space-y-2 flex flex-col border-white">
                    <Users size={20} className="text-white" />
                    <div>
                        <p className="text-xs text-[#888888] uppercase font-semibold">Leads</p>
                        <p className="text-2xl font-bold">0</p>
                    </div>
                </div>
                <div className="p-5 space-y-2 flex flex-col">
                    <QrCode size={20} className="text-white" />
                    <div>
                        <p className="text-xs text-[#888888] uppercase font-semibold">Status</p>
                        <p className="text-sm font-bold text-[#00E676]">Conectado</p>
                    </div>
                </div>
            </section>

            {/* 4. SETTINGS LAYER IF AGENTS EXIST */}
            {agentesReais[0] && (
                <section className="py-8 border-b border-white">
                    <AgentSettings 
                        agentId={agentesReais[0].id} 
                        initialPrompt={agentesReais[0].system_prompt || ''} 
                    />
                </section>
            )}

            {/* 5. AGENT MANAGEMENT LIST */}
            <section className="py-8 flex-1">
                <h3 className="font-heading text-lg font-bold mb-4 uppercase tracking-wider">Fleet Management</h3>
                <div className="border border-white divide-y divide-white rounded-none">
                    {agentesReais.length === 0 ? (
                        <div className="text-center py-8 text-[#888888] text-sm">
                            Nenhum agente configurado ainda.
                        </div>
                    ) : (
                        agentesReais.map((agent) => (
                            <div key={agent.id} className="flex justify-between items-center p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-none ${agent.is_active ? 'bg-[#00E676]' : 'bg-[#888888]'}`} />
                                    <div>
                                        <p className="text-sm font-bold uppercase">{agent.organizations?.name || 'Cliente'}</p>
                                        <p className="text-xs text-[#888888]">{agent.whatsapp_number || 'Sem número'}</p>
                                    </div>
                                </div>
                                <button className="border border-white px-3 py-1 text-xs font-bold uppercase rounded-none hover:bg-white hover:text-black transition">
                                    Edit
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* 6. FLOATING ACTION BUTTON (FAB) */}
            <button className="fixed bottom-6 right-6 bg-black border border-white p-4 rounded-full flex items-center justify-center hover:bg-white hover:text-black transition-all duration-200 group z-50">
                <Plus size={24} className="text-white group-hover:text-black transition-colors" />
            </button>

        </div>
    );
}