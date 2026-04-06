import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Building2, Settings, Bot, MessageSquare, Users, Clock, History, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import QRCodeDisplay from '@/components/QRCodeDisplay';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Guard clause is handled by layout, but we fetch safely
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Check if owner has a business config setup
  const { data: businessConfig } = await supabase
    .from('business_config')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  // Route them to onboarding if no profile exists
  if (!businessConfig) {
    redirect('/dashboard/onboarding');
  }

  // Detect connection status injected during initialization or updated by polling
  const isConnected = businessConfig.context_json?.connection_status === 'CONNECTED';

  // Fetch recent activity using Supabase server client
  const { data: recentLeads } = await supabase
    .from('leads_lobo')
    .select('id, phone, status, updated_at')
    .eq('instance_name', businessConfig.instance_name)
    .order('updated_at', { ascending: false })
    .limit(5);

  return (
    <div className="w-full max-w-4xl px-4 py-8 sm:py-16 flex flex-col gap-8 mx-auto overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-base text-gray-500 font-medium tracking-wide">
            {isConnected 
              ? 'Bem-vindo, sua IA está configurada e operando.' 
              : `Instância ${businessConfig.instance_name} provisionada. Conclua a conexão do WhatsApp.`}
          </p>
        </div>
        <a 
          href="/dashboard/settings"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-xl shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shrink-0"
        >
          <Settings size={16} className="text-blue-600" />
          Configurações
        </a>
      </div>

      {!isConnected ? (
        <QRCodeDisplay instanceName={businessConfig.instance_name} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500 w-full">
          <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-4 min-w-0">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <Building2 size={24} className="text-blue-600 shrink-0" />
              <h2 className="text-lg font-bold text-black/80 truncate">Identidade Conectada</h2>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-xs font-bold text-black/30 uppercase tracking-wider">Instância API</span>
              <span className="text-xl font-bold text-gray-800 break-all">{businessConfig.instance_name || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-xs font-bold text-black/30 uppercase tracking-wider">Empresa</span>
              <span className="text-base font-semibold text-gray-600 break-words">
                {businessConfig.context_json?.business_info?.name || 'Não definido'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-4 min-w-0">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <Bot size={24} className="text-blue-600 shrink-0" />
              <h2 className="text-lg font-bold text-black/80 truncate">Status da Secretária</h2>
            </div>
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shrink-0"></div>
                 <span className="text-base font-bold text-gray-800">Online e Monitorando</span>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed mt-2 break-words">
                Sua inteligência artificial está aguardando novos contatos no WhatsApp conectado.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI GRID */}
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500 delay-150 fill-mode-both w-full">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <MessageSquare size={16} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Atendimentos Hoje</h3>
            </div>
            <span className="text-3xl font-extrabold text-gray-900">12</span>
            <span className="text-xs font-semibold text-green-600">+3 desde ontem</span>
          </div>
          
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Clock size={16} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Agendamentos</h3>
            </div>
            <span className="text-3xl font-extrabold text-gray-900">4</span>
            <span className="text-xs font-semibold text-gray-400">Próximo às 14:00</span>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-black/5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users size={16} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Fila do Humano</h3>
            </div>
            <span className="text-3xl font-extrabold text-gray-900">1</span>
            <span className="text-xs font-semibold text-orange-500">Aguardando intervenção</span>
          </div>
        </div>
      )}

      {/* ACTIVITY FEED */}
      {isConnected && (
        <div className="bg-white rounded-2xl shadow-sm border border-black/5 flex flex-col animate-in fade-in duration-500 delay-300 fill-mode-both overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-black/5">
            <div className="flex items-center gap-2">
              <History size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-black/80">Atividade Recente</h2>
            </div>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition">Ver todos</button>
          </div>
          
          <div className="flex flex-col divide-y divide-black/5">
            {!recentLeads || recentLeads.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
                <Users size={32} className="opacity-50" />
                <p className="text-sm font-medium">Nenhum atendimento registrado ainda.</p>
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 transition min-w-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Phone size={18} className="text-blue-600" />
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-gray-900 truncate">
                        {lead.phone || 'Número Desconhecido'}
                      </span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider truncate">
                        Status: <span className="text-gray-600">{lead.status || 'NOVO'}</span>
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">
                      {lead.updated_at 
                        ? formatDistanceToNow(new Date(lead.updated_at), { addSuffix: true, locale: ptBR }) 
                        : 'agora'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
