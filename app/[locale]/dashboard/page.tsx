import React from 'react';
import { Bot, QrCode, Activity, Users, DollarSign, Settings, Power } from 'lucide-react';
// Usamos o caminho relativo que funcionou para si
import { supabaseAdmin } from '../../../lib/supabase/admin';

// Força o Next.js a procurar os dados sempre que a página for aberta (sem cache antigo)
export const dynamic = 'force-dynamic';

export default async function AgentDashboard() {
    // ==========================================
    // 🧠 CÉREBRO: PROCURAR DADOS REAIS
    // ==========================================
    const { data: agents, error } = await supabaseAdmin
        .from('agent_configs')
        .select('*, organizations(name)');

    const agentesReais = agents || [];

    // ==========================================
    // 📈 MATEMÁTICA DO MRR
    // ==========================================
    const agentesAtivos = agentesReais.filter(a => a.is_active).length;
    // Vamos assumir que cobra R$ 497 por cada agente ativo
    const mrrCalculado = agentesAtivos * 497;

    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden">

            {/* 1. LEFT SIDEBAR */}
            <aside className="w-64 bg-[#1E1E1E] border-r border-[#2C2C2C] flex flex-col">
                <div className="p-6 border-b border-[#2C2C2C]">
                    <h1 className="font-heading text-lg font-bold tracking-tighter text-white">
                        LP NEXUS
                    </h1>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <a href="#" className="flex items-center gap-3 p-3 bg-white text-black font-bold rounded-none text-sm font-body">
                        <Activity size={18} /> Dashboard
                    </a>
                    <a href="#" className="flex items-center gap-3 p-3 text-white hover:bg-[#2C2C2C] transition-colors rounded-none text-sm font-body">
                        <Bot size={18} /> Frota
                    </a>
                    <a href="#" className="flex items-center gap-3 p-3 text-white hover:bg-[#2C2C2C] transition-colors rounded-none text-sm font-body">
                        <Settings size={18} /> Configurações
                    </a>
                </nav>
                <div className="p-4 border-t border-[#2C2C2C]">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-white text-black font-bold flex items-center justify-center rounded-none font-heading">
                            M
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white font-body">Admin</p>
                            <p className="text-xs text-[#888888] font-body">Sair</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 2. MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col overflow-y-auto">

                {/* TOP HEADER */}
                <header className="h-16 bg-[#1E1E1E] border-b border-[#2C2C2C] flex items-center justify-between px-8 z-10 sticky top-0">
                    <h2 className="font-heading text-lg font-bold text-white">Dashboard</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-[#888888] font-body">18 Março, 2026</span>
                    </div>
                </header>

                {/* CONTENT MAIN */}
                <main className="p-8 space-y-8">

                    {/* STAT CARDS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <MetricCard
                            title="Receita (MRR)"
                            value={`R$ ${mrrCalculado},00`}
                            icon={<DollarSign size={20} className="text-white" />}
                        />
                        <MetricCard
                            title="Agentes Ativos"
                            value={agentesAtivos.toString()}
                            icon={<Bot size={20} className="text-white" />}
                        />
                        <MetricCard title="Conversas (24h)" value="0" icon={<Activity size={20} className="text-white" />} />
                        <MetricCard title="Leads Capturados" value="0" icon={<Users size={20} className="text-white" />} />
                    </div>

                    {/* DATA GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* COLUNA ESQUERDA: LISTA DE AGENTES */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-none p-6 shadow-none">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold flex items-center gap-2 font-heading text-white">
                                        <Bot className="text-white" size={22} /> Frota de Agentes
                                    </h3>
                                    <button className="bg-white hover:bg-gray-100 text-black font-bold px-4 py-2 rounded-none text-sm transition shadow-none font-body">
                                        + Novo Cliente
                                    </button>
                                </div>

                                {/* TABELA DE CLIENTES */}
                                <div className="space-y-2">
                                    {agentesReais.length === 0 ? (
                                        <div className="text-center py-8 text-[#888888] border border-dashed border-[#2C2C2C] rounded-none font-body">
                                            Nenhum agente configurado ainda.
                                        </div>
                                    ) : (
                                        agentesReais.map((agent) => (
                                            <AgentRow
                                                key={agent.id}
                                                name={agent.organizations?.name || 'Cliente Sem Nome'}
                                                number={agent.whatsapp_number || 'Aguardando...'}
                                                status={agent.is_active ? 'online' : 'offline'}
                                                type="SDR / Vendas"
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* COLUNA DIREITA: CONEXÃO WHATSAPP */}
                        <div className="space-y-6">
                            <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-none p-6 text-center shadow-none">
                                <h3 className="text-lg font-semibold mb-2 font-heading text-white">Conectar Dispositivo</h3>
                                <p className="text-[#888888] text-sm mb-6 font-body">Leia o QR Code com o aplicativo para injetar a IA.</p>

                                <div className="bg-white p-4 rounded-none inline-block mb-6 border border-[#2C2C2C]">
                                    <QrCode size={160} className="text-black mx-auto" />
                                </div>

                                <button className="w-full border border-[#2C2C2C] hover:bg-[#2C2C2C] text-white font-medium py-2 rounded-none transition flex items-center justify-center gap-2 shadow-none font-body text-sm">
                                    <Power size={16} /> Gerar Novo QR Code
                                </button>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}

// ==========================================
// COMPONENTES DE UI
// ==========================================

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-none p-5 flex items-center gap-4 hover:bg-[#252525] transition shadow-none">
            <div className="bg-[#2C2C2C] p-3 rounded-none">
                {icon}
            </div>
            <div>
                <p className="text-[#888888] text-xs font-medium font-body uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-bold mt-1 text-white font-heading">{value}</p>
            </div>
        </div>
    );
}

function AgentRow({ name, number, status, type }: { name: string, number: string, status: 'online' | 'offline', type: string }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-none bg-[#1E1E1E] border border-[#2C2C2C] hover:bg-[#252525] transition group cursor-pointer shadow-none">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-10 h-10 rounded-none bg-[#2C2C2C] flex items-center justify-center border border-[#2C2C2C]">
                        <Bot size={20} className="text-white" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-none border-2 border-[#1E1E1E] ${status === 'online' ? 'bg-white' : 'bg-[#888888]'}`}></div>
                </div>
                <div>
                    <h4 className="font-semibold text-white font-body text-sm">{name}</h4>
                    <p className="text-xs text-[#888888] font-body">{number}</p>
                </div>
            </div>
            <div className="text-right flex items-center gap-4">
                <span className="text-xs font-medium text-[#888888] bg-[#2C2C2C] px-2 py-1 rounded-none hidden md:block font-body">{type}</span>
                <button className="text-[#888888] hover:text-white transition opacity-0 group-hover:opacity-100">
                    <Settings size={18} />
                </button>
            </div>
        </div>
    );
}