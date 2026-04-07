import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { 
  Settings, 
  Users, 
  Calendar, 
  ClipboardList, 
  Link as LinkIcon, 
  ChevronRight, 
  Sparkles 
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import { SystemHealthCard } from '@/components/SystemHealthCard';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
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
  
  const isAiActive = (settingsRes?.value as any)?.enabled ?? true;
  const isConnected = businessConfig.context_json?.connection_status === 'CONNECTED';

  // Mock Next Appointments matching the screenshot
  const nextAppointments = [
    { time: '09:00', client: 'Maria', service: 'Buço' },
    { time: '10:30', client: 'Ana', service: 'Axila' },
    { time: '14:00', client: 'Juliana', service: 'Virilha' },
  ];

  return (
    <div className="w-full max-w-md px-6 py-8 flex flex-col gap-8 mx-auto animate-in fade-in duration-700">
      
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Olá, {user.email?.split('@')[0] || 'Bebel'}, bom dia!
        </h1>
      </div>

      {/* Next Appointments Section (from screenshot) */}
      <div className="bg-white rounded-[2rem] border border-black/5 shadow-sm overflow-hidden">
        <div className="p-6 pb-2">
            <h2 className="text-sm font-black text-blue-600 uppercase tracking-widest px-1">Próximos Atendimentos</h2>
        </div>
        <div className="flex flex-col divide-y divide-black/5">
          {nextAppointments.map((app, i) => (
            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-gray-900">{app.time}</span>
                <span className="text-gray-300">|</span>
                <span className="text-sm font-bold text-gray-500">
                    {app.client} <span className="text-gray-400 font-medium">({app.service})</span>
                </span>
              </div>
            </div>
          ))}
        </div>
        <Link 
          href="/dashboard/agenda"
          className="w-full py-4 flex items-center justify-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50/50 transition-all border-t border-black/5"
        >
          Ver agenda completa
          <ChevronRight size={14} />
        </Link>
      </div>

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
        <button className="aspect-square bg-rose-400 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-lg shadow-rose-400/20 hover:scale-[1.02] active:scale-95 transition-all group">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md group-hover:bg-white/30 transition-all">
            <LinkIcon size={32} />
          </div>
          <span className="text-sm font-black text-white uppercase tracking-wider leading-tight">Link de Agendamento</span>
        </button>

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
                      {isConnected ? 'WhatsApp Conectado' : 'Aguardando QR Code'}
                  </span>
              </div>
          </div>
          
          <Link 
            href="/dashboard/test"
            className="w-full py-5 bg-white border border-black/5 rounded-3xl flex items-center justify-center gap-3 text-sm font-black text-gray-900 shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            Testar meu atendimento
            <ChevronRight size={18} className="text-blue-600" />
          </Link>
      </div>

      {/* Connection Logic Rendering */}
      {!isConnected && (
        <div className="mt-8">
            <QRCodeDisplay instanceName={businessConfig.instance_name} />
        </div>
      )}
    </div>
  );
}
