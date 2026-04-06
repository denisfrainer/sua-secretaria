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
          className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-xl shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shrink-0"
        >
          <Settings size={16} className="text-blue-600" />
          Configurações
        </a>
      </div>

      {!isConnected ? (
        <QRCodeDisplay instanceName={businessConfig.instance_name} />
      ) : (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Bot size={24} className="text-blue-600" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0"></div>
                <h2 className="text-base font-bold text-gray-900 truncate">Online e Monitorando</h2>
              </div>
              <p className="text-sm font-medium text-gray-500 truncate">
                Instância: <span className="font-bold text-gray-700 uppercase">{businessConfig.instance_name}</span>
              </p>
            </div>
          </div>
          
          <div className="px-4 py-2 bg-gray-50 rounded-lg flex flex-col sm:items-end justify-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Status do Sistema</span>
            <span className="text-xs font-bold text-gray-600">Aguardando novos contatos</span>
          </div>
        </div>
      )}

      {/* KPI GRID */}
      {isConnected && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 animate-in fade-in duration-500 delay-150 fill-mode-both w-full">
          <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-sm border border-black/5 flex flex-col gap-1 sm:gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-0.5 sm:mb-1">
              <MessageSquare size={14} className="sm:size-[16px]" />
              <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-wider">Atendimentos</h3>
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">12</span>
            <span className="text-[10px] sm:text-xs font-semibold text-green-600 truncate">+3 hoje</span>
          </div>
          
          <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-sm border border-black/5 flex flex-col gap-1 sm:gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-0.5 sm:mb-1">
              <Clock size={14} className="sm:size-[16px]" />
              <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-wider">Agendas</h3>
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">4</span>
            <span className="text-[10px] sm:text-xs font-semibold text-gray-400 truncate">às 14:00</span>
          </div>

          <div className="bg-white rounded-2xl p-3.5 sm:p-5 shadow-sm border border-black/5 flex flex-col gap-1 sm:gap-2">
            <div className="flex items-center gap-2 text-gray-500 mb-0.5 sm:mb-1">
              <Users size={14} className="sm:size-[16px]" />
              <h3 className="text-[10px] sm:text-sm font-bold uppercase tracking-wider">Fila</h3>
            </div>
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">1</span>
            <span className="text-[10px] sm:text-xs font-semibold text-orange-500 truncate">Aguardando</span>
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
