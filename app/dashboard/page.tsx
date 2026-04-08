import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import QuickActions from '@/components/dashboard/QuickActions';
import { motion } from 'framer-motion';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Defensive data fetching with Admin-to-Standard fallback
  let businessConfig = null;
  let profile = null;

  try {
    // 1. Try fetching with Admin client first for higher reliability (bypasses RLS)
    if (supabaseAdmin) {
      const [adminConfig, adminProfile] = await Promise.all([
        supabaseAdmin.from('business_config').select('*').eq('owner_id', user?.id).maybeSingle(),
        supabaseAdmin.from('profiles').select('full_name').eq('id', user?.id).maybeSingle()
      ]);

      businessConfig = adminConfig.data;
      profile = adminProfile.data;
    }

    // 2. Fallback to standard client for business_config if Admin failed or is missing
    if (!businessConfig) {
      const { data } = await supabase
        .from('business_config')
        .select('*')
        .eq('owner_id', user?.id)
        .maybeSingle();
      businessConfig = data;
    }
  } catch (err) {
    console.error('❌ [DASHBOARD_FETCH] Error during data fetching:', err);
  }

  const isConnected = businessConfig?.context_json?.connection_status === 'CONNECTED';
  
  // Robust name fallbacks (Profile > Metadata > Email > Default)
  const displayName = profile?.full_name?.split(' ')[0]
    || user?.user_metadata?.full_name?.split(' ')[0] 
    || user?.user_metadata?.name?.split(' ')[0]
    || user?.email?.split('@')[0] 
    || 'Empresa';

  return (
    <div className="w-full max-w-md px-6 py-8 flex flex-col gap-8 mx-auto animate-in fade-in duration-700">
      
      {/* Dynamic Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <DashboardGreeting userName={displayName} />
      </motion.div>

      {/* Real-time Next Appointments Section */}
      <UpcomingAppointments />

      {/* Main Action Grid (Premium Silicon Valley Aesthetic) */}
      <QuickActions />

      {/* System status section */}
      <motion.div 
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1], delay: 0.25 }}
        className="mt-4 flex flex-col gap-4"
      >
          <div className="flex items-center justify-between px-2">
              <h3 className="text-base font-semibold text-gray-600 tracking-tight">Status do sistema</h3>
              <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-base font-medium text-gray-600 tracking-tight">
                      {isConnected ? 'WhatsApp conectado' : 'Aguardando configuração'}
                  </span>
              </div>
          </div>
      </motion.div>

    </div>
  );
}
