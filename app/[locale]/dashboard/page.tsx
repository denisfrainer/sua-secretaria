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
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-8 font-sans">

            {/* HEADER DO SAAS */}
            <header className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        LP Express | Nexus
                    </h1>
                    <p className="text-zinc-400 mt-1">Gestão de Agentes Autónomos (SDR)</p>
                </div>
                <div className="flex items-center gap-4">
                    <button className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded-full transition">
                        <Settings size={20} className="text-zinc-400" />
                    </button>
                    <div className="h-10 w-10 rounded-full border-2 border-emerald-500 overflow-hidden">
                        <img src="https://github.com/shadcn.png" alt="Mago Avatar" />
                    </div>
                </div>
            </header>

            {/* MÉTRICAS DE GUERRA (Dinâmicas) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <MetricCard
                    title="Receita (MRR)"
                    value={`R$ ${mrrCalculado},00`}
                    icon={<DollarSign size={22} className="text-emerald-400" />}
                />
                <MetricCard
                    title="Agentes Ativos"
                    value={agentesAtivos.toString()}
                    icon={<Bot size={22} className="text-cyan-400" />}
                />
                {/* Métricas abaixo ainda simuladas até ligarmos o WhatsApp */}
                <MetricCard title="Conversas (24h)" value="0" icon={<Activity size={22} className="text-purple-400" />} />
                <MetricCard title="Leads Capturados" value="0" icon={<Users size={22} className="text-blue-400" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUNA ESQUERDA: LISTA DE AGENTES REAIS */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Bot className="text-emerald-400" size={24} /> Frota de Agentes
                            </h2>
                            <button className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-4 py-2 rounded-lg text-sm transition">
                                + Novo Cliente
                            </button>
                        </div>

                        {/* TABELA DE CLIENTES (Loop de dados) */}
                        <div className="space-y-4">
                            {agentesReais.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                                    Nenhum agente configurado ainda. Insira o primeiro cliente na base de dados!
                                </div>
                            ) : (
                                agentesReais.map((agent) => (
                                    <AgentRow
                                        key={agent.id}
                                        name={agent.organizations?.name || 'Cliente Sem Nome'}
                                        number={agent.whatsapp_number || 'A aguardar conexão...'}
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
                    <div className="bg-gradient-to-b from-[#18181b] to-[#0f0f12] border border-zinc-800 rounded-xl p-6 text-center shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-cyan-400"></div>

                        <h3 className="text-lg font-semibold mb-2">Conectar Dispositivo</h3>
                        <p className="text-zinc-400 text-sm mb-6">Leia o QR Code com o telemóvel do cliente para injetar a IA.</p>

                        <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-lg shadow-emerald-500/10">
                            <QrCode size={180} className="text-zinc-900 mx-auto" />
                        </div>

                        <button className="w-full border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium py-2 rounded-lg transition flex items-center justify-center gap-2">
                            <Power size={16} /> Gerar Novo QR Code
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ==========================================
// COMPONENTES DE UI
// ==========================================

function MetricCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 flex items-center gap-4 hover:border-zinc-700 transition">
            <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                {icon}
            </div>
            <div>
                <p className="text-zinc-400 text-sm font-medium">{title}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
        </div>
    );
}

function AgentRow({ name, number, status, type }: { name: string, number: string, status: 'online' | 'offline', type: string }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800 transition group cursor-pointer">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <Bot size={20} className="text-zinc-400" />
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#18181b] ${status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                </div>
                <div>
                    <h4 className="font-semibold text-zinc-200">{name}</h4>
                    <p className="text-xs text-zinc-500">{number}</p>
                </div>
            </div>
            <div className="text-right flex items-center gap-4">
                <span className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2 py-1 rounded-md hidden md:block">{type}</span>
                <button className="text-zinc-500 hover:text-zinc-300 transition opacity-0 group-hover:opacity-100">
                    <Settings size={18} />
                </button>
            </div>
        </div>
    );
}