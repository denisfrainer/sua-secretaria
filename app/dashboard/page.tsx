import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import QuickActions from '@/components/dashboard/QuickActions';

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

  const isConnected = businessConfig?.context_json?.connection_status === 'CONNECTED';
  
  // Robust name fallbacks
  const displayName = user.user_metadata?.full_name?.split(' ')[0] 
    || user.user_metadata?.name?.split(' ')[0]
    || user.email?.split('@')[0] 
    || 'Bebel';

  return (
    <div className="w-full max-w-md px-6 py-8 flex flex-col gap-8 mx-auto animate-in fade-in duration-700">
      
      {/* Dynamic Welcome Header */}
      <DashboardGreeting userName={displayName} />

      {/* Real-time Next Appointments Section */}
      <UpcomingAppointments />

      {/* Main Action Grid (Premium Silicon Valley Aesthetic) */}
      <QuickActions />

      {/* System status section */}
      <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
              <h3 className="text-base font-semibold text-gray-600 tracking-tight">Status do sistema</h3>
              <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-base font-medium text-gray-600 tracking-tight">
                      {isConnected ? 'WhatsApp conectado' : 'Aguardando configuração'}
                  </span>
              </div>
          </div>
      </div>

    </div>
  );
}
