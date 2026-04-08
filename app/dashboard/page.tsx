import { createClient } from '@/lib/supabase/server';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import QuickActions from '@/components/dashboard/QuickActions';
import { SystemStatus } from '@/components/dashboard/SystemStatus';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();


  // Defensive data fetching with Admin fallback to Standard client
  let businessConfig = null;
  let profile = null;

  try {
    // Try Admin first for reliability (bypasses RLS issues)
    if (supabaseAdmin) {
      const [configRes, profileRes] = await Promise.all([
        supabaseAdmin.from('business_config').select('*').eq('owner_id', user?.id).maybeSingle(),
        supabaseAdmin.from('profiles').select('full_name').eq('id', user?.id).single()
      ]);
      
      businessConfig = configRes.data;
      profile = profileRes.data;
    } 
    
    // Fallback if admin failed or returned nothing
    if (!businessConfig) {
      const { data } = await supabase.from('business_config').select('*').eq('owner_id', user?.id).maybeSingle();
      businessConfig = data;
    }
  } catch (error) {
    console.warn('⚠️ [DASHBOARD] Fetching error, attempting fallback...', error);
    // Final fallback attempt with standard client
    const { data } = await supabase.from('business_config').select('*').eq('owner_id', user?.id).maybeSingle();
    businessConfig = data;
  }

  // Strict Gating: If user exists but essential registration data is missing, we might still show skeleton
  // However, we at least want a name to show.
  const isConnected = businessConfig?.context_json?.connection_status === 'CONNECTED';
  
  // Safely extract email prefix
  const userEmail = user?.email || '';
  const emailPrefix = userEmail ? userEmail.split('@')[0] : '';
  const formattedPrefix = emailPrefix ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1) : '';

  // Determine final display name
  const displayName = profile?.full_name?.split(' ')[0] 
    || user?.user_metadata?.full_name?.split(' ')[0]
    || formattedPrefix 
    || 'Visitante';

  return (
    <div className="w-full max-w-md px-6 py-8 flex flex-col gap-8 mx-auto animate-in fade-in duration-700">
      
      {/* Dynamic Welcome Header (Motion inside) */}
      <DashboardGreeting userName={displayName} />

      {/* Real-time Next Appointments Section (Motion inside) */}
      <UpcomingAppointments />

      {/* Main Action Grid (Motion inside) */}
      <QuickActions />

      {/* System status section (Client Component with Motion) */}
      <SystemStatus isConnected={isConnected} />

    </div>
  );
}
