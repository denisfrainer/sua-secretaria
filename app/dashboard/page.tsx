import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { 
  Settings, 
  Calendar, 
  ClipboardList, 
  ChevronRight, 
} from 'lucide-react';
import Link from 'next/link';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { AppointmentLinkButton } from '@/components/dashboard/AppointmentLinkButton';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: businessConfig } = await supabase
    .from('business_config')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!businessConfig) {
    redirect('/dashboard/onboarding');
  }

  const { data: settingsRes } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'eliza_active')
    .maybeSingle();
  
  const isConnected = businessConfig.context_json?.connection_status === 'CONNECTED';
  const userName = user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Bebel';

  return (
    <div className="w-full max-w-md px-6 py-8 flex flex-col gap-8 mx-auto animate-in fade-in duration-700">
      
      {/* Dynamic Welcome Header */}
      <DashboardGreeting userName={userName} />

      {/* Real-time Next Appointments Section */}
      <UpcomingAppointments />

      {/* Main Action Grid (The 4 Modules) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Module 1: Agenda */}
        <Link 
          href="/dashboard/agenda"
          className="aspect-square bg-blue-500 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-lg shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all group"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/30 transition-all">
            <Calendar size={32} />
          </div>
          <span className="text-sm font-black text-white uppercase tracking-wider">Agenda</span>
        </Link>

        {/* Module 2: Serviços */}
        <Link 
          href="/dashboard/services"
          className="aspect-square bg-orange-400 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-lg shadow-orange-400/20 hover:scale-[1.02] active:scale-95 transition-all group"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/30 transition-all">
            <ClipboardList size={32} />
          </div>
          <span className="text-sm font-black text-white uppercase tracking-wider">Serviços</span>
        </Link>

        {/* Module 3: Link de Agendamento */}
        <AppointmentLinkButton businessId={businessConfig.id} />

        {/* Module 4: Configurações */}
        <Link 
          href="/dashboard/settings"
          className="aspect-square bg-emerald-400 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-lg shadow-emerald-400/20 hover:scale-[1.02] active:scale-95 transition-all group"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/30 transition-all">
            <Settings size={32} />
          </div>
          <span className="text-sm font-black text-white uppercase tracking-wider">Configurações</span>
        </Link>
      </div>

      {/* System Status Section (Subtle) */}
      <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status do Sistema</h3>
              <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {isConnected ? 'WhatsApp Conectado' : 'Aguardando Configuração'}
                  </span>
              </div>
          </div>
      </div>

    </div>
  );
}
