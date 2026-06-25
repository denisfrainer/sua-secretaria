import { createClient } from '@/lib/supabase/server';
import { UpcomingAppointments } from '@/components/dashboard/UpcomingAppointments';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import QuickActions from '@/components/dashboard/QuickActions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { StatusHeader } from '@/components/dashboard/StatusHeader';
import { BrainSelector } from '@/components/dashboard/BrainSelector';
import { redirect } from 'next/navigation';
import { google } from 'googleapis';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { endOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        supabaseAdmin.from('profiles').select('full_name, plan_tier, trial_ends_at, google_refresh_token').eq('id', user?.id).single()
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
          timeMin: now.toISOString(),
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
          .slice(0, 3);
        
        isIntegrated = true;
        console.log(`[DASHBOARD_FETCH] Agenda fetched: ${initialAgenda.length} events`);
      } catch (gCalError: any) {
        console.warn('[DASHBOARD_FETCH] GCal fetch error:', gCalError.message);
        isIntegrated = true;
      }
    } else {
        console.log('[DASHBOARD_FETCH] No refresh token found. isIntegrated = false');
    }
  } catch (error) {
    console.warn('⚠️ [DASHBOARD] Fetching error, attempting fallback...', error);
    const [{ data: configData }, { data: profileData }] = await Promise.all([
      supabase.from('business_config').select('*').eq('owner_id', user?.id).maybeSingle(),
      supabase.from('profiles').select('full_name, plan_tier, trial_ends_at').eq('id', user?.id).single()
    ]);
    businessConfig = configData;
    profile = profileData;
    
    console.log('[DASHBOARD_FETCH] Fallback Profile:', profile);
  }

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
    <div className="w-full max-w-md px-6 py-8 flex flex-col gap-6 mx-auto animate-in fade-in duration-700">
      
      {/* 1. Greeting */}
      <DashboardGreeting userName={displayName} />

      {/* 2. Status Header — The "Life" Indicator */}
      <StatusHeader />

      {/* 3. Brain Selector — AI vs Menu (only when connected) */}
      {isConnected && <BrainSelector />}

      {/* 4. Upcoming Appointments */}
      <UpcomingAppointments initialAgenda={initialAgenda} initialIntegrated={isIntegrated} />

      {/* 5. Quick Actions Grid (2x2) */}
      <QuickActions 
        planTier={profile?.plan_tier} 
        trialEndsAt={profile?.trial_ends_at} 
      />

    </div>
  );
}
