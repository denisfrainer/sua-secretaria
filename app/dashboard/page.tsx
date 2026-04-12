import { createClient } from '@/lib/supabase/server';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import QuickActions from '@/components/dashboard/QuickActions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { TrialStatusBox } from '@/components/dashboard/TrialStatusBox';
import { redirect } from 'next/navigation';
import { google } from 'googleapis';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { startOfDay, endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { cookies } from 'next/headers';
import { ElizaRoiCard } from '@/components/dashboard/eliza-roi-card';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();


  // Defensive data fetching with Admin fallback to Standard client
  let businessConfig = null;
  let profile = null;
  let initialAgenda: any[] = [];
  let isIntegrated = false;

  try {
    // Try Admin first for reliability (bypasses RLS issues)
    if (supabaseAdmin) {
      const [configRes, profileRes] = await Promise.all([
        supabaseAdmin.from('business_config').select('*').eq('owner_id', user?.id).maybeSingle(),
        supabaseAdmin.from('profiles').select('full_name, plan_tier, trial_ends_at').eq('id', user?.id).single()
      ]);
      
      businessConfig = configRes.data;
      profile = profileRes.data;
    } 
    
    console.log('[DASHBOARD_FETCH] Profile:', profile);

    // 2. FETCH AGENDA SERVER-SIDE (To eliminate 401 race conditions)
    const refreshToken = profile?.google_refresh_token || (businessConfig?.context_json as any)?.google_calendar?.refresh_token;

    if (refreshToken && businessConfig) {
      try {
        const authClient = await getGoogleAuthClient(businessConfig.id, {
          ...businessConfig.context_json,
          google_calendar: {
            ...(businessConfig.context_json as any).google_calendar,
            refresh_token: refreshToken
          }
        });
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        const now = new Date();
        const timeMax = endOfDay(now).toISOString();

        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: now.toISOString(), // Start from now to avoid fetching past events
          timeMax,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const events = response.data.items || [];
        initialAgenda = events
          .map(event => ({
            id: event.id,
            title: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description || '',
          }))
          .filter(app => {
            const appStart = app.start ? new Date(app.start) : null;
            return appStart && appStart > now;
          })
          .slice(0, 3); // Match the client-side slice of 3
        
        isIntegrated = true;
        console.log(`[DASHBOARD_FETCH] Agenda fetched: ${initialAgenda.length} events`);
      } catch (gCalError: any) {
        console.warn('[DASHBOARD_FETCH] GCal fetch error:', gCalError.message);
        // Fallback: If we have a token, consider it integrated but with empty initial agenda
        // This allows the client-side component to try fetching again.
        isIntegrated = true;
      }
    } else {
        console.log('[DASHBOARD_FETCH] No refresh token found. isIntegrated = false');
    }
  } catch (error) {
    console.warn('⚠️ [DASHBOARD] Fetching error, attempting fallback...', error);
    // Final fallback attempt with standard client for both config and profile
    const [{ data: configData }, { data: profileData }] = await Promise.all([
      supabase.from('business_config').select('*').eq('owner_id', user?.id).maybeSingle(),
      supabase.from('profiles').select('full_name, plan_tier, trial_ends_at').eq('id', user?.id).single()
    ]);
    businessConfig = configData;
    profile = profileData;
    
    console.log('[DASHBOARD_FETCH] Fallback Profile:', profile);
  }

  // Strict Gating: If user exists but essential registration data is missing, we might still show skeleton
  // However, we at least want a name to show.
  const hasInstance = Boolean(businessConfig?.instance_name);
  const isConnected = hasInstance && businessConfig?.context_json?.connection_status === 'CONNECTED';
  
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
      
      {/* Trial Status Indicator (Railway Style) */}
      <div className="flex justify-end w-full -mt-3 -mb-3">
        <TrialStatusBox 
          planTier={profile?.plan_tier || 'FREE'} 
          trialEndsAt={profile?.trial_ends_at || null} 
        />
      </div>

      {/* Dynamic Welcome Header (Motion inside) */}
      <DashboardGreeting userName={displayName} isConnected={isConnected} />

      {/* Real-time Next Appointments Section (Motion inside) */}
      <UpcomingAppointments initialAgenda={initialAgenda} initialIntegrated={isIntegrated} />

      {/* Main Action Grid (Motion inside) */}
      <QuickActions />

      {/* ROI Dashboard (Mock) */}
      <ElizaRoiCard />

    </div>
  );
}
