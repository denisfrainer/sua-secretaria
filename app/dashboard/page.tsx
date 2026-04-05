import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Building2, Sparkles } from 'lucide-react';
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

  return (
    <div className="w-full max-w-4xl px-4 py-8 sm:py-16 flex flex-col gap-8">
      <div className="flex items-center justify-between">
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
          className="flex items-center gap-2 px-4 py-2 bg-white border border-black/5 rounded-xl shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all"
        >
          <Sparkles size={16} className="text-blue-600" />
          Configurações
        </a>
      </div>

      {!isConnected ? (
        <QRCodeDisplay instanceName={businessConfig.instance_name} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <Building2 size={24} className="text-blue-600" />
              <h2 className="text-lg font-bold text-black/80">Identidade Conectada</h2>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-xs font-bold text-black/30 uppercase tracking-wider">Instância API</span>
              <span className="text-xl font-bold text-gray-800">{businessConfig.instance_name || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-xs font-bold text-black/30 uppercase tracking-wider">Empresa</span>
              <span className="text-base font-semibold text-gray-600">
                {businessConfig.context_json?.business_info?.name || 'Não definido'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col gap-4">
            <div className="flex items-center gap-3 border-b border-black/5 pb-4">
              <Sparkles size={24} className="text-blue-600" />
              <h2 className="text-lg font-bold text-black/80">Status da Secretária</h2>
            </div>
            <div className="flex flex-col gap-3 mt-2">
              <div className="flex items-center gap-3">
                 <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-base font-bold text-gray-800">Online e Monitorando</span>
              </div>
              <p className="text-sm font-medium text-gray-500 leading-relaxed mt-2">
                Sua inteligência artificial está aguardando novos contatos no WhatsApp conectado.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
