import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getGoogleAuthClient } from '@/lib/calendar/google';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Fetch the centralized refresh token from the profiles table using ADMIN client
  // Using Admin client bypasses RLS which is safer during background/API operations.
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.warn('[GCAL_SYNC] Profile lookup warning:', profileError.message);
  }

  // 2. Fetch business_config (context_json used as secondary cache)
  const { data: businessConfig } = await supabaseAdmin
    .from('business_config')
    .select('id, owner_id, context_json')
    .eq('owner_id', user.id)
    .single();

  if (!businessConfig) {
    return NextResponse.json({ error: 'Business configuration not found' }, { status: 404 });
  }

  const refreshToken = profile?.google_refresh_token || (businessConfig.context_json as any).google_calendar?.refresh_token;

  if (!refreshToken) {
    console.warn('[GCAL_SYNC] Google Calendar not integrated for user:', user.id);
    return NextResponse.json({ integrated: false, agenda: [] });
  }

  try {
    console.log('[GCAL_SYNC] Fetching today\'s agenda for user:', user.id);
    const authClient = await getGoogleAuthClient(businessConfig.id, {
      ...businessConfig.context_json,
      google_calendar: {
        ...(businessConfig.context_json as any).google_calendar,
        refresh_token: refreshToken
      }
    });
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const now = new Date();
    const timeMin = startOfDay(now).toISOString();
    const timeMax = endOfDay(now).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`[GCAL_SYNC] Successfully fetched ${events.length} events from Google Calendar`);

    // Map Google events to Frontend structure
    const agenda = events.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description || '',
    }));

    return NextResponse.json({ 
      integrated: true, 
      agenda 
    });

  } catch (error: any) {
    console.error('💥 [GCAL_SYNC] CRITICAL ERROR FETCHING AGENDA:', {
      message: error.message,
      stack: error.stack,
      user_id: user.id
    });
    
    // DETAILED INTEGRATION ERROR DETECTION:
    // If it's an integration error (missing token, invalid grant, 401, etc.), return 200 with integrated: false
    const isIntegrationError = 
      error.message.includes('not integrated') || 
      error.message.includes('invalid_grant') || 
      error.message.includes('No refresh token is set') ||
      error.message.includes('invalid_request') ||
      (error.code === 401);

    if (isIntegrationError) {
      console.warn('⚠️ [GCAL_SYNC] Non-critical integration failure. Showing reconnect UI.');
      return NextResponse.json({ integrated: false, agenda: [] });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch calendar events',
      details: error.message 
    }, { status: 500 });
  }
}
